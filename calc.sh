#!/bin/bash
rm ./battle_run_cache.json
unzip ../scripts/data/battle.zip
npm run shipcalc
node build/scripts/scoring
zip ./battle.zip ./battle_run_cache.json && mv ./battle.zip ../scripts/data
