#!/bin/bash
#SBATCH --gres=gpu:1
#SBATCH --partition=gpuA100 
#SBATCH --time=01:30:00
#SBATCH --job-name=ccv_er
#SBATCH --output=ccv_er.out
 
# Activate environment
uenv verbose cuda-11.4 cudnn-11.4-8.2.4
uenv miniconda3-py38

conda activate ccv
python longchecker/longchecker/predict.py \
    --checkpoint_path="longchecker/checkpoints/scifact.ckpt" \
    --input_file="data/eclaims.jsonl" \
    --corpus_file="data/ecorpus.jsonl" \
    --output_file="data/erelations.jsonl" \
    --batch_size 16