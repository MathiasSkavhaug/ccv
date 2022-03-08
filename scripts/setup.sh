#!/bin/bash

# Sets up the necessary environment 
# starts indexing the cord-19 dataset
# and downloads other data.

sudo apt update
sudo apt install maven

conda create --name c19fnd python=3.9 -y
conda activate c19fnd
conda install -c conda-forge openjdk=11 -y
python -m pip install torch==1.8.2+cu111 torchvision==0.9.2+cu111 torchaudio===0.8.2 -f https://download.pytorch.org/whl/lts/1.8/torch_lts.html
conda install -c conda-forge faiss -y
python -m pip install pyserini
python -m pip install nltk

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

mkdir data
wget https://github.com/asaakyan/covidfact/raw/main/COVIDFACT_dataset.jsonl -O ./data/covidfact.jsonl
bash longchecker/script/get_data.sh
cat data/scifact/claims* > data/scifact_claims.jsonl

# modify longchecker/longchecker/data.py in order to add truncation when tokenizing
sed -i "s/self.tokenizer(claim + self.tokenizer.eos_token + cited_text)/self.tokenizer(claim + self.tokenizer.eos_token + cited_text, truncation=True)/g" longchecker/longchecker/data.py
# truncated abstracts might fail sanity check
sed -i "s/assert len(abstract_sent_idx) == len(sentences)/# assert len(abstract_sent_idx) == len(sentences)/g" longchecker/longchecker/data.py
