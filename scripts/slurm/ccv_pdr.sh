#!/bin/bash
#SBATCH --gres=gpu:1
#SBATCH --partition=gpuA100 
#SBATCH --time=10:00:00
#SBATCH --job-name=ccv_pdr
#SBATCH --output=ccv_pdr.out
 
# Activate environment
uenv verbose cuda-11.4 cudnn-11.4-8.2.4
uenv miniconda3-py38

conda activate ccv
python ccv/preprocess_claims.py \
    --index "./anserini/indexes/lucene-index-cord19-abstract-2022-02-07" \
    --nkeep 20 \
    --ninit 100 \
    --input "./data/covidfact.jsonl" \
    --claim_col "claim" \
    --output_claims "./data/predict_claims.jsonl" \
    --output_corpus "./data/predict_corpus.jsonl" \
    --rerank
    --batch_size 100