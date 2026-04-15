#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Map, Symbol, String
};

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
}

const YES: Symbol = symbol_short!("YES");
const NO: Symbol = symbol_short!("NO");

#[contract]
pub struct PollContract;

#[contractimpl]
impl PollContract {
    /// Creates a new poll. Returns the new poll ID.
    pub fn create_poll(env: Env, creator: Address, question: String) -> u32 {
        creator.require_auth();

        let mut count: u32 = env.storage().instance().get(&DataKey::PollCount).unwrap_or(0);
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

        let mut poll = polls.get(poll_id).unwrap_or_else(|| panic!("poll_not_found"));
        
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

        let mut poll = polls.get(poll_id).unwrap_or_else(|| panic!("poll_not_found"));
        
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

        // Save
        polls.set(poll_id, poll);
        env.storage().instance().set(&DataKey::Polls, &polls);
        env.storage().instance().set(&voted_key, &true);

        env.events()
            .publish((symbol_short!("vote"), voter), (poll_id, option));
    }

    /// Returns all polls
    pub fn get_polls(env: Env) -> Map<u32, Poll> {
        env.storage()
            .instance()
            .get(&DataKey::Polls)
            .unwrap_or_else(|| Map::new(&env))
    }
}

#[cfg(test)]
mod test;
