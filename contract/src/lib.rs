#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Map, Symbol, String, IntoVal,
};

// ─────────────────────────────────────────────
// Data types
// ─────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Poll {
    pub id: u32,
    pub question: String,
    pub yes: u32,
    pub no: u32,
    pub creator: Address,
    pub closed: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Polls,
    PollCount,
    Voted(u32, Address),
    /// Optional: address of the VOTE reward-token contract
    RewardToken,
}

const YES: Symbol = symbol_short!("YES");
const NO: Symbol = symbol_short!("NO");

/// One VOTE token is minted per vote cast (7 decimal places → 1_000_000_0).
const REWARD_AMOUNT: i128 = 10_000_000;

// ─────────────────────────────────────────────
// Contract
// ─────────────────────────────────────────────

#[contract]
pub struct PollContract;

#[contractimpl]
impl PollContract {
    // ── Admin ──────────────────────────────────────────────────

    /// Register the address of the VOTE token contract so that
    /// inter-contract calls can mint rewards to voters.
    /// Can only be set once (or requires the current admin — simplified
    /// here for testnet: anyone can set it if it's not yet set).
    pub fn set_reward_token(env: Env, token_id: Address) {
        if env.storage().instance().has(&DataKey::RewardToken) {
            panic!("reward_token_already_set");
        }
        env.storage().instance().set(&DataKey::RewardToken, &token_id);
        env.events()
            .publish((symbol_short!("reward"), symbol_short!("set")), token_id);
    }

    /// Returns the configured reward-token address (if any).
    pub fn get_reward_token(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::RewardToken)
    }

    // ── Polls ──────────────────────────────────────────────────

    /// Creates a new poll. Returns the new poll ID.
    pub fn create_poll(env: Env, creator: Address, question: String) -> u32 {
        creator.require_auth();

        let mut count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::PollCount)
            .unwrap_or(0);
        count += 1;

        let poll = Poll {
            id: count,
            question,
            yes: 0,
            no: 0,
            creator: creator.clone(),
            closed: false,
        };

        let mut polls: Map<u32, Poll> = env
            .storage()
            .instance()
            .get(&DataKey::Polls)
            .unwrap_or_else(|| Map::new(&env));

        polls.set(count, poll);

        env.storage().instance().set(&DataKey::Polls, &polls);
        env.storage().instance().set(&DataKey::PollCount, &count);

        env.events()
            .publish((symbol_short!("create"), creator), count);

        count
    }

    /// Closes a poll. Only the creator can do this.
    pub fn close_poll(env: Env, caller: Address, poll_id: u32) {
        caller.require_auth();

        let mut polls: Map<u32, Poll> = env
            .storage()
            .instance()
            .get(&DataKey::Polls)
            .unwrap_or_else(|| Map::new(&env));

        let mut poll = polls
            .get(poll_id)
            .unwrap_or_else(|| panic!("poll_not_found"));

        if poll.creator != caller {
            panic!("not_creator");
        }

        poll.closed = true;
        polls.set(poll_id, poll);
        env.storage().instance().set(&DataKey::Polls, &polls);

        env.events()
            .publish((symbol_short!("close"), caller), poll_id);
    }

    /// Cast a vote. `voter` must sign the transaction.
    /// If a VOTE reward-token is configured, 1 VOTE token is minted
    /// to the voter via an inter-contract call.
    pub fn vote(env: Env, voter: Address, poll_id: u32, option: Symbol) {
        voter.require_auth();

        // Normalise option to YES or NO
        if option != YES && option != NO {
            panic!("invalid_option");
        }

        let mut polls: Map<u32, Poll> = env
            .storage()
            .instance()
            .get(&DataKey::Polls)
            .unwrap_or_else(|| Map::new(&env));

        let mut poll = polls
            .get(poll_id)
            .unwrap_or_else(|| panic!("poll_not_found"));

        if poll.closed {
            panic!("poll_closed");
        }

        // Check duplicates specific to this poll
        let voted_key = DataKey::Voted(poll_id, voter.clone());
        if env.storage().instance().has(&voted_key) {
            panic!("already_voted");
        }

        // Tally the vote
        if option == YES {
            poll.yes += 1;
        } else {
            poll.no += 1;
        }

        // Persist
        polls.set(poll_id, poll);
        env.storage().instance().set(&DataKey::Polls, &polls);
        env.storage().instance().set(&voted_key, &true);

        // ── Inter-contract call: mint VOTE reward ──────────────
        // Only fires if a reward-token contract address was registered.
        // The PollContract must have been set as admin of the VoteToken.
        if let Some(token_id) = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::RewardToken)
        {
            let poll_contract = env.current_contract_address();
            // Cross-contract call into VoteToken::mint(admin, to, amount)
            env.invoke_contract::<()>(
                &token_id,
                &symbol_short!("mint"),
                soroban_sdk::vec![
                    &env,
                    poll_contract.into_val(&env),
                    voter.clone().into_val(&env),
                    REWARD_AMOUNT.into_val(&env),
                ],
            );
        }

        env.events()
            .publish((symbol_short!("vote"), voter), (poll_id, option));
    }

    /// Returns all polls.
    pub fn get_polls(env: Env) -> Map<u32, Poll> {
        env.storage()
            .instance()
            .get(&DataKey::Polls)
            .unwrap_or_else(|| Map::new(&env))
    }
}

#[cfg(test)]
mod test;
