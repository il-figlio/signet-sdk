//! Signet SDK Test CLI
//!
//! A command-line tool for testing and interacting with the Signet SDK features.

use alloy::{
    network::{EthereumWallet, TransactionBuilder},
    primitives::{Address, U256},
    rpc::types::TransactionRequest,
    signers::{local::PrivateKeySigner, Signer},
};
use clap::{Parser, Subcommand};
use comfy_table::{presets::UTF8_FULL, Attribute, Cell, Color, ContentArrangement, Table};
use eyre::Result;
use indicatif::{ProgressBar, ProgressStyle};
use owo_colors::{OwoColorize, Stream::Stdout};
use signet_bundle::SignetEthBundle;
use signet_constants::{pecorino, SignetConstants};
use signet_tx_cache::client::TxCache;
use signet_types::UnsignedFill;
use std::time::Duration;

#[derive(Parser)]
#[command(name = "signet")]
#[command(version)]
#[command(about = "A pragmatic CLI for testing Signet SDK features", long_about = None)]
#[command(after_help = "Signet is just a rollup. Learn more at https://signet.sh")]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    /// Disable colored output
    #[arg(long, global = true)]
    no_color: bool,
}

#[derive(Subcommand)]
enum Commands {
    /// Display Signet constants and configuration
    #[command(alias = "const")]
    Constants {
        /// Show constants in JSON format
        #[arg(short, long)]
        json: bool,
    },

    /// Transaction cache operations
    #[command(alias = "cache")]
    TxCache {
        #[command(subcommand)]
        operation: TxCacheOps,
    },

    /// Create and display an unsigned fill using the builder pattern
    #[command(alias = "fill")]
    CreateFill {
        /// Rollup chain ID
        #[arg(short, long)]
        rollup_chain_id: u64,

        /// Target chain ID for the fill
        #[arg(short, long)]
        target_chain_id: u64,

        /// Order contract address on target chain
        #[arg(short, long)]
        order_contract: String,

        /// Deadline timestamp (seconds since epoch)
        #[arg(short, long)]
        deadline: Option<u64>,

        /// Permit2 nonce
        #[arg(short, long)]
        nonce: Option<u64>,
    },

    /// Sign a test transaction and display it
    #[command(alias = "sign")]
    SignTx {
        /// Private key (hex string)
        #[arg(short, long)]
        private_key: String,

        /// To address
        #[arg(short, long)]
        to: String,

        /// Value in wei
        #[arg(short, long, default_value = "0")]
        value: u64,

        /// Chain ID
        #[arg(short, long, default_value = "1")]
        chain_id: u64,
    },

    /// Create and display a bundle
    #[command(alias = "bundle")]
    CreateBundle {
        /// Number of sample transactions to include
        #[arg(short, long, default_value = "1")]
        num_txs: usize,

        /// Include sample fill
        #[arg(short, long)]
        with_fill: bool,
    },
}

#[derive(Subcommand)]
enum TxCacheOps {
    /// Get transactions from the cache
    #[command(alias = "get-txs")]
    GetTransactions {
        /// Transaction cache URL (defaults to Pecorino)
        #[arg(short, long)]
        url: Option<String>,
    },

    /// Get orders from the cache
    GetOrders {
        /// Transaction cache URL (defaults to Pecorino)
        #[arg(short, long)]
        url: Option<String>,
    },

    /// Send a test transaction to the cache (requires private key)
    #[command(alias = "send")]
    SendTransaction {
        /// Private key (hex string)
        #[arg(short, long)]
        private_key: String,

        /// To address
        #[arg(short, long)]
        to: String,

        /// Transaction cache URL (defaults to Pecorino)
        #[arg(short, long)]
        url: Option<String>,

        /// Value in wei
        #[arg(short, long, default_value = "0")]
        value: u64,
    },

    /// Display the default Pecorino tx-cache URL
    Url,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt().with_target(false).with_level(false).init();

    let cli = Cli::parse();

    // Print header
    print_header();

    match cli.command {
        Commands::Constants { json } => {
            handle_constants(json)?;
        }
        Commands::TxCache { operation } => {
            handle_tx_cache(operation).await?;
        }
        Commands::CreateFill {
            rollup_chain_id,
            target_chain_id,
            order_contract,
            deadline,
            nonce,
        } => {
            handle_create_fill(rollup_chain_id, target_chain_id, &order_contract, deadline, nonce)?;
        }
        Commands::SignTx { private_key, to, value, chain_id } => {
            handle_sign_tx(&private_key, &to, value, chain_id).await?;
        }
        Commands::CreateBundle { num_txs, with_fill } => {
            handle_create_bundle(num_txs, with_fill)?;
        }
    }

    Ok(())
}

fn print_header() {
    println!();
    println!(
        "{}",
        r#"
   _____ _                  _
  / ____(_)                | |
 | (___  _  __ _ _ __   ___| |_
  \___ \| |/ _` | '_ \ / _ \ __|
  ____) | | (_| | | | |  __/ |_
 |_____/|_|\__, |_| |_|\___|\__|
            __/ |
           |___/
"#
        .if_supports_color(Stdout, |text| text.bright_cyan())
    );
    println!(
        "  {}",
        "A pragmatic Ethereum rollup".if_supports_color(Stdout, |text| text.dimmed().italic())
    );
    println!();
}

fn print_section_header(title: &str) {
    println!(
        "\n{} {}\n",
        "▸".if_supports_color(Stdout, |text| text.bright_cyan().bold()),
        title.if_supports_color(Stdout, |text| text.bold())
    );
}

fn print_success(message: &str) {
    println!("{} {}", "✓".if_supports_color(Stdout, |text| text.green().bold()), message);
}

fn print_info(label: &str, value: &str) {
    println!(
        "  {} {}",
        format!("{}:", label).if_supports_color(Stdout, |text| text.bright_blue()),
        value.if_supports_color(Stdout, |text| text.white())
    );
}

fn print_address(label: &str, addr: impl std::fmt::Display) {
    println!(
        "  {} {}",
        format!("{}:", label).if_supports_color(Stdout, |text| text.bright_blue()),
        format!("{}", addr).if_supports_color(Stdout, |text| text.bright_yellow())
    );
}

fn print_value(label: &str, value: impl std::fmt::Display) {
    println!(
        "  {} {}",
        format!("{}:", label).if_supports_color(Stdout, |text| text.bright_blue()),
        format!("{}", value).if_supports_color(Stdout, |text| text.bright_green())
    );
}

fn handle_constants(json: bool) -> Result<()> {
    let constants = SignetConstants::pecorino();

    if json {
        println!("{}", serde_json::to_string_pretty(&constants.system())?);
    } else {
        print_section_header("Signet Pecorino Quickstart");

        // Network Names
        println!(
            "  {} {}",
            "Host Network:".if_supports_color(Stdout, |text| text.bright_blue()),
            constants
                .environment()
                .host_name()
                .if_supports_color(Stdout, |text| text.cyan().bold())
        );
        println!(
            "  {} {}",
            "Rollup Network:".if_supports_color(Stdout, |text| text.bright_blue()),
            constants
                .environment()
                .rollup_name()
                .if_supports_color(Stdout, |text| text.cyan().bold())
        );
        println!();

        // Host Chain Table
        let mut table = Table::new();
        table
            .load_preset(UTF8_FULL)
            .set_content_arrangement(ContentArrangement::Dynamic)
            .set_header(vec![
                Cell::new(format!("Host Chain ({})", pecorino::HOST_NAME))
                    .add_attribute(Attribute::Bold)
                    .fg(Color::Cyan),
                Cell::new(""),
            ]);

        table.add_row(vec![
            Cell::new("Chain ID").fg(Color::Blue),
            Cell::new(pecorino::HOST_CHAIN_ID).fg(Color::White),
        ]);
        table.add_row(vec![
            Cell::new("Zenith").fg(Color::Blue),
            Cell::new(pecorino::HOST_ZENITH).fg(Color::Yellow),
        ]);
        table.add_row(vec![
            Cell::new("Transactor").fg(Color::Blue),
            Cell::new(pecorino::HOST_TRANSACTOR).fg(Color::Yellow),
        ]);
        table.add_row(vec![
            Cell::new("Host Orders").fg(Color::Blue),
            Cell::new(pecorino::HOST_ORDERS).fg(Color::Yellow),
        ]);
        table.add_row(vec![
            Cell::new("Passage").fg(Color::Blue),
            Cell::new(pecorino::HOST_PASSAGE).fg(Color::Yellow),
        ]);

        println!("{table}");
        println!();

        // Host Tokens Table
        let mut table = Table::new();
        table
            .load_preset(UTF8_FULL)
            .set_content_arrangement(ContentArrangement::Dynamic)
            .set_header(vec![
                Cell::new("Host Tokens").add_attribute(Attribute::Bold).fg(Color::Cyan),
                Cell::new(""),
            ]);

        table.add_row(vec![
            Cell::new("USDC").fg(Color::Blue),
            Cell::new(pecorino::HOST_USDC).fg(Color::Yellow),
        ]);
        table.add_row(vec![
            Cell::new("USDT").fg(Color::Blue),
            Cell::new(pecorino::HOST_USDT).fg(Color::Yellow),
        ]);
        table.add_row(vec![
            Cell::new("WBTC").fg(Color::Blue),
            Cell::new(pecorino::HOST_WBTC).fg(Color::Yellow),
        ]);
        table.add_row(vec![
            Cell::new("WETH").fg(Color::Blue),
            Cell::new(pecorino::HOST_WETH).fg(Color::Yellow),
        ]);

        println!("{table}");
        println!();

        // Rollup Chain Table
        let mut table = Table::new();
        table
            .load_preset(UTF8_FULL)
            .set_content_arrangement(ContentArrangement::Dynamic)
            .set_header(vec![
                Cell::new(format!("Rollup Chain ({})", pecorino::RU_NAME))
                    .add_attribute(Attribute::Bold)
                    .fg(Color::Cyan),
                Cell::new(""),
            ]);

        table.add_row(vec![
            Cell::new("Chain ID").fg(Color::Blue),
            Cell::new(pecorino::RU_CHAIN_ID).fg(Color::White),
        ]);
        table.add_row(vec![
            Cell::new("Rollup Orders").fg(Color::Blue),
            Cell::new(pecorino::RU_ORDERS).fg(Color::Yellow),
        ]);
        table.add_row(vec![
            Cell::new("Rollup Passage").fg(Color::Blue),
            Cell::new(pecorino::RU_PASSAGE).fg(Color::Yellow),
        ]);
        table.add_row(vec![
            Cell::new("Base Fee Recipient").fg(Color::Blue),
            Cell::new(pecorino::BASE_FEE_RECIPIENT).fg(Color::Yellow),
        ]);

        println!("{table}");
        println!();

        // Rollup Tokens Table
        let mut table = Table::new();
        table
            .load_preset(UTF8_FULL)
            .set_content_arrangement(ContentArrangement::Dynamic)
            .set_header(vec![
                Cell::new("Rollup Tokens").add_attribute(Attribute::Bold).fg(Color::Cyan),
                Cell::new(""),
            ]);

        table.add_row(vec![
            Cell::new("Wrapped USD (Native)").fg(Color::Blue),
            Cell::new(pecorino::WRAPPED).fg(Color::Yellow),
        ]);
        table.add_row(vec![
            Cell::new("WBTC").fg(Color::Blue),
            Cell::new(pecorino::RU_WBTC).fg(Color::Yellow),
        ]);
        table.add_row(vec![
            Cell::new("WETH").fg(Color::Blue),
            Cell::new(pecorino::RU_WETH).fg(Color::Yellow),
        ]);

        println!("{table}");
        println!();

        // Additional Info
        print_info("Transaction Cache URL", constants.environment().transaction_cache());
        print_address("Native Token Address", signet_constants::NATIVE_TOKEN_ADDRESS);

        println!(
            "\n{} {}",
            "💡".if_supports_color(Stdout, |text| text.yellow()),
            "Use these addresses and chain IDs when interacting with Signet Pecorino"
                .if_supports_color(Stdout, |text| text.dimmed())
        );
        println!();
    }

    Ok(())
}

async fn handle_tx_cache(operation: TxCacheOps) -> Result<()> {
    match operation {
        TxCacheOps::GetTransactions { url } => {
            let cache = create_tx_cache(url)?;

            print_section_header("Fetching Transactions");
            print_info("Cache URL", cache.url().as_str());

            let spinner = create_spinner("Loading transactions...");
            let txs = cache.get_transactions().await?;
            spinner.finish_and_clear();

            if txs.is_empty() {
                println!(
                    "  {} No transactions found in cache",
                    "ℹ".if_supports_color(Stdout, |text| text.blue())
                );
            } else {
                print_success(&format!("Found {} transaction(s)", txs.len()));

                for (i, tx) in txs.iter().enumerate() {
                    println!(
                        "\n  {} {}",
                        "Transaction".if_supports_color(Stdout, |text| text.bright_blue().bold()),
                        format!("#{}", i + 1).if_supports_color(Stdout, |text| text.cyan())
                    );
                    println!(
                        "  {}",
                        "─".repeat(60).if_supports_color(Stdout, |text| text.dimmed())
                    );
                    println!("  {:#?}", tx);
                }
            }
            println!();
        }
        TxCacheOps::GetOrders { url } => {
            let cache = create_tx_cache(url)?;

            print_section_header("Fetching Orders");
            print_info("Cache URL", cache.url().as_str());

            let spinner = create_spinner("Loading orders...");
            let orders = cache.get_orders().await?;
            spinner.finish_and_clear();

            if orders.is_empty() {
                println!(
                    "  {} No orders found in cache",
                    "ℹ".if_supports_color(Stdout, |text| text.blue())
                );
            } else {
                print_success(&format!("Found {} order(s)", orders.len()));

                for (i, order) in orders.iter().enumerate() {
                    println!(
                        "\n  {} {}",
                        "Order".if_supports_color(Stdout, |text| text.bright_blue().bold()),
                        format!("#{}", i + 1).if_supports_color(Stdout, |text| text.cyan())
                    );
                    println!(
                        "  {}",
                        "─".repeat(60).if_supports_color(Stdout, |text| text.dimmed())
                    );
                    println!("{}", serde_json::to_string_pretty(&order)?);
                }
            }
            println!();
        }
        TxCacheOps::SendTransaction { private_key, to, url, value } => {
            let cache = create_tx_cache(url)?;
            let to_addr: Address = to.parse()?;

            print_section_header("Sending Transaction");

            // Parse private key and create signer
            let signer: PrivateKeySigner = private_key.parse()?;
            let from = signer.address();

            print_address("From", from);
            print_address("To", to_addr);
            print_value("Value", format!("{} wei", value));
            print_info("Cache URL", cache.url().as_str());

            // Create a simple transaction
            let tx = TransactionRequest::default()
                .with_to(to_addr)
                .with_value(U256::from(value))
                .with_gas_limit(21000)
                .with_max_fee_per_gas(1_000_000_000)
                .with_max_priority_fee_per_gas(1_000_000_000)
                .with_nonce(0)
                .with_chain_id(1);

            let spinner = create_spinner("Signing transaction...");
            let wallet = EthereumWallet::from(signer);
            let envelope = tx.build(&wallet).await?;
            spinner.finish_and_clear();

            print_success("Transaction signed");

            let spinner = create_spinner("Sending to cache...");
            let response = cache.forward_raw_transaction(envelope).await?;
            spinner.finish_and_clear();

            print_success("Transaction sent successfully");
            println!(
                "\n{}",
                "Response:".if_supports_color(Stdout, |text| text.bright_blue().bold())
            );
            println!("{}", serde_json::to_string_pretty(&response)?);
            println!();
        }
        TxCacheOps::Url => {
            print_section_header("Transaction Cache URL");
            println!(
                "  {}",
                pecorino::TX_CACHE_URL.if_supports_color(Stdout, |text| text.bright_cyan().bold())
            );
            println!();
        }
    }

    Ok(())
}

fn handle_create_fill(
    rollup_chain_id: u64,
    target_chain_id: u64,
    order_contract: &str,
    deadline: Option<u64>,
    nonce: Option<u64>,
) -> Result<()> {
    print_section_header("Creating Unsigned Fill");

    let order_contract_addr: Address = order_contract.parse()?;

    print_value("Rollup Chain ID", rollup_chain_id);
    print_value("Target Chain ID", target_chain_id);
    print_address("Order Contract", order_contract_addr);
    if let Some(dl) = deadline {
        print_value("Deadline", dl);
    }
    if let Some(n) = nonce {
        print_value("Nonce", n);
    }

    // Create an UnsignedFill using the builder pattern
    let spinner = create_spinner("Building fill...");
    let mut fill = UnsignedFill::default();
    fill = fill.with_rollup_chain_id(rollup_chain_id);
    fill = fill.with_target_chain(target_chain_id, order_contract_addr);

    if let Some(dl) = deadline {
        fill = fill.with_deadline(dl);
    }

    if let Some(n) = nonce {
        fill = fill.with_nonce(n);
    }
    spinner.finish_and_clear();

    print_success("Fill created using builder pattern");

    println!("\n{}", "Fill Structure:".if_supports_color(Stdout, |text| text.bright_blue().bold()));
    println!("{}", serde_json::to_string_pretty(&fill)?);

    println!(
        "\n{} {}",
        "💡".if_supports_color(Stdout, |text| text.yellow()),
        "This fill has no orders. Add orders using .with_orders() or .with_order() before signing."
            .if_supports_color(Stdout, |text| text.dimmed())
    );
    println!();

    Ok(())
}

async fn handle_sign_tx(private_key: &str, to: &str, value: u64, chain_id: u64) -> Result<()> {
    print_section_header("Signing Transaction");

    let signer: PrivateKeySigner = private_key.parse()?;
    let to_addr: Address = to.parse()?;
    let from = signer.address();

    print_address("From", from);
    print_address("To", to_addr);
    print_value("Value", format!("{} wei", value));
    print_value("Chain ID", chain_id);

    // Create and sign transaction
    let tx = TransactionRequest::default()
        .with_to(to_addr)
        .with_value(U256::from(value))
        .with_gas_limit(21000)
        .with_max_fee_per_gas(1_000_000_000)
        .with_max_priority_fee_per_gas(1_000_000_000)
        .with_nonce(0)
        .with_chain_id(chain_id);

    let spinner = create_spinner("Signing...");
    let wallet = EthereumWallet::from(signer);
    let envelope = tx.build(&wallet).await?;
    spinner.finish_and_clear();

    print_success("Transaction signed successfully");

    println!(
        "\n{}",
        "Signed Envelope:".if_supports_color(Stdout, |text| text.bright_blue().bold())
    );
    println!("{:#?}", envelope);
    println!();

    Ok(())
}

fn handle_create_bundle(num_txs: usize, with_fill: bool) -> Result<()> {
    print_section_header("Creating Bundle");

    print_value("Transactions", num_txs);
    print_info("Include Fill", if with_fill { "Yes" } else { "No" });

    let spinner = create_spinner("Creating bundle...");
    let bundle = SignetEthBundle::default();
    spinner.finish_and_clear();

    print_success("Bundle created");

    println!(
        "\n{}",
        "Bundle Structure:".if_supports_color(Stdout, |text| text.bright_blue().bold())
    );
    println!("{}", serde_json::to_string_pretty(&bundle)?);

    println!(
        "\n{} {}",
        "💡".if_supports_color(Stdout, |text| text.yellow()),
        "Bundle Workflow:".if_supports_color(Stdout, |text| text.bold())
    );
    println!(
        "  {} Add transactions using .with_tx() or .with_txs()",
        "1.".if_supports_color(Stdout, |text| text.cyan())
    );
    println!(
        "  {} Add fills using .with_host_fill()",
        "2.".if_supports_color(Stdout, |text| text.cyan())
    );
    println!(
        "  {} Validate fills on-chain before simulation",
        "3.".if_supports_color(Stdout, |text| text.cyan())
    );
    println!(
        "  {} Simulate using SignetEthBundleDriver",
        "4.".if_supports_color(Stdout, |text| text.cyan())
    );
    println!();

    Ok(())
}

fn create_tx_cache(url: Option<String>) -> Result<TxCache> {
    if let Some(url) = url {
        TxCache::new_from_string(&url)
    } else {
        Ok(TxCache::pecorino())
    }
}

fn create_spinner(msg: &str) -> ProgressBar {
    let spinner = ProgressBar::new_spinner();
    spinner.set_style(
        ProgressStyle::default_spinner()
            .tick_strings(&["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"])
            .template("{spinner:.cyan} {msg}")
            .unwrap(),
    );
    spinner.set_message(msg.to_string());
    spinner.enable_steady_tick(Duration::from_millis(80));
    spinner
}
