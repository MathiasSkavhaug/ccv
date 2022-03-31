#!/bin/bash
#SBATCH --gres=gpu:1
#SBATCH --partition=gpuA100 
#SBATCH --time=03:00:00
#SBATCH --job-name=ccv_fpwf
#SBATCH --output=ccv_fpwf.out
 
# Activate environment
uenv verbose cuda-11.4 cudnn-11.4-8.2.4
uenv miniconda3-py38

conda activate ccv
python ccv/run_query.py --claim "ccv_viz/ccv_viz/static/data/claims.txt"