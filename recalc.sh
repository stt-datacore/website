#!/bin/bash
npm run shipcalc-fresh
node build/scripts/scoring
zip ./battle.zip ./battle_run_cache.json && mv ./battle.zip ../scripts/data
