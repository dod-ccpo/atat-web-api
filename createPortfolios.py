#!/usr/bin/env python3

import json
import random

import requests
from faker import Faker

CSP = ["CSP A", "CSP B"]
DOD_COMPONENTS = [
    "air_force",
    "army",
    "marine_corps",
    "navy",
    "space_force",
]

COUNT = 5
fake = Faker()

BASE_URL = "https://enmjbo0xqj.execute-api.us-gov-west-1.amazonaws.com/prod/portfolioDrafts"

for i in range(COUNT):
    portfolio_draft = requests.post(BASE_URL).json()
    print(json.dumps(portfolio_draft, indent=2))
    id = portfolio_draft['id']
    portfolio_step = {}
    portfolio_step["name"] = " ".join(fake.words())
    portfolio_step["description"] = fake.sentence()
    portfolio_step["csp"] = fake.random_choices(elements=CSP)
    portfolio_step["dod_components"] = fake.random_choices(elements=DOD_COMPONENTS)
    portfolio_step["portfolio_managers"] = [fake.email(domain="foobartest.mil")]
    portfolio = requests.post(f"{BASE_URL}/{id}/portfolio", json=portfolio_step).json()
    print(json.dumps(portfolio, indent=2))