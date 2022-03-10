#!/bin/bash
#SBATCH --gres=gpu:0
#SBATCH --partition=gpuA100 
#SBATCH --time=00:05:00
#SBATCH --job-name=ccv_fp
#SBATCH --output=ccv_fp.out
 
# Activate environment
uenv verbose cuda-11.4 cudnn-11.4-8.2.4
uenv miniconda3-py38

conda activate ccv
python ccv/run_query.py \
    --claim "SARS-CoV-2 binds ACE2 receptor to gain entry into cells" \
    --exe_id "a8f5f167f44f4964e6c998dee827110c"