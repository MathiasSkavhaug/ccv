#!/bin/bash

# Sets up the necessary environment 
# and starts indexing the cord-19 dataset.

sudo apt update
sudo apt install maven

conda create --name c19fnd python=3.9 -y
conda activate c19fnd
conda install -c conda-forge openjdk=11 -y
python -m pip install torch==1.8.1 torchvision==0.9.1 torchaudio===0.8.1 -f https://download.pytorch.org/whl/torch_stable.html
conda install -c conda-forge faiss -y
python -m pip install pyserini

git clone https://github.com/castorini/anserini.git --recurse-submodules
cd anserini/
mvn clean package appassembler:assemble

python src/main/python/trec-covid/index_cord19.py --date 2022-02-07 --download --index

cd ..
git clone https://github.com/dwadden/longchecker.git
cd longchecker/

python -m pip install pytorch-lightning==1.2.1

python script/get_checkpoint.py longformer_large_science
python script/get_checkpoint.py scifact

cd ..