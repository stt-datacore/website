#!/bin/bash
npm run shipcalc-fresh
zip ./battle.zip ./battle_run_cache.json && mv ./battle.zip ../scripts/data
