#!/bin/bash
#SBATCH --gres=gpu:1
#SBATCH --partition=gpuA100 
#SBATCH --time=00:10:00
#SBATCH --job-name=ccv_fp
#SBATCH --output=ccv_fp.out
 
# Activate environment
uenv verbose cuda-11.4 cudnn-11.4-8.2.4
uenv miniconda3-py38

conda activate ccv
python ccv/run_query.py --claim "The coronavirus cannot thrive in warmer climates."