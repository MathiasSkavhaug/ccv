#!/bin/bash
#SBATCH --gres=gpu:1
#SBATCH --partition=gpuA100 
#SBATCH --time=02:00:00
#SBATCH --job-name=ccv_pls
#SBATCH --output=ccv_pls.out
 
# Activate environment
uenv verbose cuda-11.4 cudnn-11.4-8.2.4
uenv miniconda3-py38

conda activate longchecker
python longchecker/longchecker/predict.py \
    --checkpoint_path="longchecker/checkpoints/scifact.ckpt" \
    --input_file="data/predict_claims.jsonl" \
    --corpus_file="data/predict_corpus.jsonl" \
    --output_file="data/predict_result.jsonl"