#!/bin/bash
#SBATCH --gres=gpu:1
#SBATCH --partition=gpuA100 
#SBATCH --time=01:00:00
#SBATCH --job-name=c19fnd_pls
#SBATCH --output=c19fnd_pls.out
 
# Activate environment
uenv verbose cuda-11.4 cudnn-11.4-8.2.4
uenv miniconda-python39
echo "TEST1"
conda activate c19fnd
echo "TEST2"

# Run the Python script that uses the GPU
./scripts/predict.sh