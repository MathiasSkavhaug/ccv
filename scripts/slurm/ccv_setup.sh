#!/bin/bash
#SBATCH --gres=gpu:0
#SBATCH --partition=gpuA100 
#SBATCH --time=01:30:00
#SBATCH --job-name=c19fnd_setup
#SBATCH --output=c19fnd_setup.out
 
# Set up environment
uenv verbose cuda-11.4 cudnn-11.4-8.2.4
uenv miniconda3-py38

conda create --name pyserini python=3.8 -y
conda activate pyserini
conda install -c conda-forge openjdk=11 -y
python -m pip install torch==1.8.1 torchvision==0.9.1 torchaudio===0.8.1 -f https://download.pytorch.org/whl/torch_stable.html
conda install -c conda-forge faiss -y
python -m pip install pyserini
python -m pip install nltk

conda create --name longchecker python=3.8 conda-build -y
conda activate longchecker
python -m pip install -r longchecker/requirements.txt
python -m pip install torch==1.8.2+cu111 torchvision==0.9.2+cu111 torchaudio===0.8.2 -f https://download.pytorch.org/whl/lts/1.8/torch_lts.html