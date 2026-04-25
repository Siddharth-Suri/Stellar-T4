#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, symbol_short, Address, Env};

fn setup_contract() -> (Env, PollContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(PollContract, ());
    let client = PollContractClient::new(&env, &contract_id);
    (env, client)
}

// ── Core poll lifecycle ─────────────────────────────────────

#[test]
fn test_create_and_vote() {
    let (env, client) = setup_contract();
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);

    // Create poll
    let p_id = client.create_poll(&creator, &soroban_sdk::String::from_str(&env, "Does this work?"));
    assert_eq!(p_id, 1);

    let polls = client.get_polls();
    assert_eq!(polls.len(), 1);

    // Vote YES
    client.vote(&voter, &p_id, &symbol_short!("YES"));

    // Verify tally
    let polls = client.get_polls();
    let poll = polls.get(p_id).unwrap();
    assert_eq!(poll.yes, 1);
    assert_eq!(poll.no, 0);

    // Close poll
    client.close_poll(&creator, &p_id);

    // Verify closed
    let polls = client.get_polls();
    assert_eq!(polls.get(p_id).unwrap().closed, true);
}

#[test]
fn test_vote_no() {
    let (env, client) = setup_contract();
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);

    let p_id = client.create_poll(&creator, &soroban_sdk::String::from_str(&env, "NO test?"));
    client.vote(&voter, &p_id, &symbol_short!("NO"));

    let poll = client.get_polls().get(p_id).unwrap();
    assert_eq!(poll.yes, 0);
    assert_eq!(poll.no, 1);
}

#[test]
fn test_multiple_polls_independent() {
    let (env, client) = setup_contract();
    let creator = Address::generate(&env);
    let v1 = Address::generate(&env);
    let v2 = Address::generate(&env);

    let p1 = client.create_poll(&creator, &soroban_sdk::String::from_str(&env, "Poll 1"));
    let p2 = client.create_poll(&creator, &soroban_sdk::String::from_str(&env, "Poll 2"));

    client.vote(&v1, &p1, &symbol_short!("YES"));
    client.vote(&v2, &p2, &symbol_short!("NO"));

    let polls = client.get_polls();
    assert_eq!(polls.get(p1).unwrap().yes, 1);
    assert_eq!(polls.get(p2).unwrap().no, 1);
    assert_eq!(polls.len(), 2);
}

// ── Error cases ─────────────────────────────────────────────

#[test]
#[should_panic(expected = "already_voted")]
fn test_duplicate_vote() {
    let (env, client) = setup_contract();
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);

    let p_id = client.create_poll(&creator, &soroban_sdk::String::from_str(&env, "Test"));
    client.vote(&voter, &p_id, &symbol_short!("YES"));
    // Second vote should panic
    client.vote(&voter, &p_id, &symbol_short!("NO"));
}

#[test]
#[should_panic(expected = "poll_closed")]
fn test_vote_closed_poll() {
    let (env, client) = setup_contract();
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);

    let p_id = client.create_poll(&creator, &soroban_sdk::String::from_str(&env, "Test"));
    client.close_poll(&creator, &p_id);
    client.vote(&voter, &p_id, &symbol_short!("YES"));
}

#[test]
#[should_panic(expected = "not_creator")]
fn test_invalid_close() {
    let (env, client) = setup_contract();
    let creator = Address::generate(&env);
    let hacker = Address::generate(&env);

    let p_id = client.create_poll(&creator, &soroban_sdk::String::from_str(&env, "Test"));
    client.close_poll(&hacker, &p_id);
}

#[test]
#[should_panic(expected = "invalid_option")]
fn test_invalid_vote_option() {
    let (env, client) = setup_contract();
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);

    let p_id = client.create_poll(&creator, &soroban_sdk::String::from_str(&env, "Test"));
    client.vote(&voter, &p_id, &symbol_short!("MAYBE"));
}

// ── Reward-token setup ──────────────────────────────────────

#[test]
fn test_set_and_get_reward_token() {
    let (env, client) = setup_contract();
    let fake_token = Address::generate(&env);
    client.set_reward_token(&fake_token);
    assert_eq!(client.get_reward_token(), Some(fake_token));
}

#[test]
#[should_panic(expected = "reward_token_already_set")]
fn test_set_reward_token_twice_panics() {
    let (env, client) = setup_contract();
    let t1 = Address::generate(&env);
    let t2 = Address::generate(&env);
    client.set_reward_token(&t1);
    client.set_reward_token(&t2); // must panic
}
