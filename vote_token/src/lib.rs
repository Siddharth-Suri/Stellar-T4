#![no_std]
/// VOTE Token — a minimal Soroban SEP-41 / SAC-compatible fungible token.
///
/// Deployed independently; its address is registered in PollContract via
/// `set_reward_token(token_id)`. PollContract is the sole admin/minter,
/// calling `mint(admin, voter, amount)` on every vote cast.
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String,
};

// ─────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────
#[contracttype]
pub enum DataKey {
    Admin,
    Balance(Address),
    TotalSupply,
}

// ─────────────────────────────────────────────
// Token metadata (hard-coded for simplicity)
// ─────────────────────────────────────────────
const TOKEN_NAME: &str = "VOTE Reward Token";
const TOKEN_SYMBOL: &str = "VOTE";
const TOKEN_DECIMALS: u32 = 7;

#[contract]
pub struct VoteToken;

#[contractimpl]
impl VoteToken {
    // ── Initialise ─────────────────────────────────────────────

    /// Deploy and set the initial admin (should be the PollContract address).
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already_initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TotalSupply, &0_i128);
        env.events()
            .publish((symbol_short!("init"), symbol_short!("admin")), admin);
    }

    // ── Admin helpers ──────────────────────────────────────────

    fn require_admin(env: &Env, caller: &Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("not_initialized"));
        if &admin != caller {
            panic!("unauthorized");
        }
        caller.require_auth();
    }

    /// Transfer admin rights (e.g. for upgrades).
    pub fn set_admin(env: Env, current_admin: Address, new_admin: Address) {
        Self::require_admin(&env, &current_admin);
        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }

    /// Returns the current admin address.
    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("not_initialized"))
    }

    // ── SEP-41 interface ───────────────────────────────────────

    /// Returns the token name.
    pub fn name(_env: Env) -> String {
        String::from_str(&_env, TOKEN_NAME)
    }

    /// Returns the token symbol.
    pub fn symbol(_env: Env) -> String {
        String::from_str(&_env, TOKEN_SYMBOL)
    }

    /// Returns the number of decimal places (7).
    pub fn decimals(_env: Env) -> u32 {
        TOKEN_DECIMALS
    }

    /// Returns total tokens in circulation.
    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }

    /// Returns the VOTE token balance for `account`.
    pub fn balance(env: Env, account: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Balance(account))
            .unwrap_or(0)
    }

    /// Mint `amount` tokens to `to`. Only callable by the admin (PollContract).
    pub fn mint(env: Env, admin: Address, to: Address, amount: i128) {
        Self::require_admin(&env, &admin);
        if amount <= 0 {
            panic!("invalid_amount");
        }

        let prev: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Balance(to.clone()), &(prev + amount));

        let supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply + amount));

        env.events()
            .publish((symbol_short!("mint"), to), amount);
    }

    /// Transfer tokens between accounts. Caller (`from`) must sign.
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        if amount <= 0 {
            panic!("invalid_amount");
        }

        let from_bal: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance(from.clone()))
            .unwrap_or(0);
        if from_bal < amount {
            panic!("insufficient_balance");
        }

        env.storage()
            .instance()
            .set(&DataKey::Balance(from.clone()), &(from_bal - amount));

        let to_bal: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Balance(to.clone()), &(to_bal + amount));

        env.events()
            .publish((symbol_short!("transfer"), from), (to, amount));
    }
}

#[cfg(test)]
mod test;
