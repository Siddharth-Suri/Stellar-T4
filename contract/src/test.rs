#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, symbol_short, Address, Env};

#[test]
fn test_create_and_vote() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PollContract);
    let client = PollContractClient::new(&env, &contract_id);

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
#[should_panic(expected = "already_voted")]
fn test_duplicate_vote() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PollContract);
    let client = PollContractClient::new(&env, &contract_id);
    
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
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PollContract);
    let client = PollContractClient::new(&env, &contract_id);
    
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);

    let p_id = client.create_poll(&creator, &soroban_sdk::String::from_str(&env, "Test"));
    client.close_poll(&creator, &p_id);
    client.vote(&voter, &p_id, &symbol_short!("YES"));
}

#[test]
#[should_panic(expected = "not_creator")]
fn test_invalid_close() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PollContract);
    let client = PollContractClient::new(&env, &contract_id);
    
    let creator = Address::generate(&env);
    let hacker = Address::generate(&env);

    let p_id = client.create_poll(&creator, &soroban_sdk::String::from_str(&env, "Test"));
    client.close_poll(&hacker, &p_id);
}
