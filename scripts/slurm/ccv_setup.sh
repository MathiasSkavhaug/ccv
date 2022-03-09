#!/bin/bash
#SBATCH --gres=gpu:0
#SBATCH --partition=gpuA100 
#SBATCH --time=01:30:00
#SBATCH --job-name=ccv_setup
#SBATCH --output=ccv_setup.out
 
# Set up environment
uenv verbose cuda-11.4 cudnn-11.4-8.2.4
uenv miniconda3-py38
conda env create -f environment.yml