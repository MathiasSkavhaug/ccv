#!/bin/bash
#SBATCH --gres=gpu:0
#SBATCH --partition=gpuA100 
#SBATCH --time=00:30:00
#SBATCH --job-name=c19fnd_pd
#SBATCH --output=c19fnd_pd.out
 
# Activate environment
uenv verbose cuda-11.4 cudnn-11.4-8.2.4
uenv miniconda3-py38

conda activate pyserini
python scripts/preprocess_claims.py \
    --index "./anserini/indexes/lucene-index-cord19-abstract-2022-02-07" \
    --k 20 \
    --input "./data/covidfact.jsonl" \
    --claim_col "claim" \
    --output_claims "./data/predict_claims.jsonl" \
    --output_corpus "./data/predict_corpus.jsonl"