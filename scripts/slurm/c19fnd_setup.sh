#!/bin/bash
#SBATCH --gres=gpu:0
#SBATCH --partition=gpuA100 
#SBATCH --time=01:15:00
#SBATCH --job-name=c19fnd_setup
#SBATCH --output=c19fnd_setup.out
 
# Set up environment
uenv verbose cuda-11.4 cudnn-11.4-8.2.4
uenv miniconda-python39

conda create --name c19fnd -y
conda activate c19fnd
conda install -c conda-forge openjdk=11 -y
python -m pip install torch==1.8.1 torchvision==0.9.1 torchaudio===0.8.1 -f https://download.pytorch.org/whl/torch_stable.html
conda install -c conda-forge faiss -y
python -m pip install pyserini
python -m pip install pytorch-lightning==1.2.1