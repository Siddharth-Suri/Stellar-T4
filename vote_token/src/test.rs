#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup() -> (Env, VoteTokenClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(VoteToken, ());
    let client = VoteTokenClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin, user)
}

#[test]
fn test_initialize_and_metadata() {
    let (_env, client, _admin, _user) = setup();
    assert_eq!(client.decimals(), 7);
    assert_eq!(client.total_supply(), 0);
}

#[test]
fn test_mint_increases_balance() {
    let (_env, client, admin, user) = setup();
    client.mint(&admin, &user, &10_000_000);
    assert_eq!(client.balance(&user), 10_000_000);
    assert_eq!(client.total_supply(), 10_000_000);
}

#[test]
fn test_transfer() {
    let (_env, client, admin, user) = setup();
    let other = Address::generate(&_env);
    client.mint(&admin, &user, &20_000_000);
    client.transfer(&user, &other, &10_000_000);
    assert_eq!(client.balance(&user), 10_000_000);
    assert_eq!(client.balance(&other), 10_000_000);
}

#[test]
#[should_panic(expected = "insufficient_balance")]
fn test_transfer_insufficient() {
    let (_env, client, admin, user) = setup();
    let other = Address::generate(&_env);
    client.mint(&admin, &user, &5_000_000);
    client.transfer(&user, &other, &10_000_000);
}

#[test]
#[should_panic(expected = "unauthorized")]
fn test_mint_unauthorized() {
    let (_env, client, _admin, user) = setup();
    let bad_actor = Address::generate(&_env);
    client.mint(&bad_actor, &user, &10_000_000);
}
