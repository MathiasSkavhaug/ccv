#!/bin/bash

# Sets up the necessary environment,
# starts indexing the cord-19 dataset,
# downloads model checkpoints,
# and does other necessary setup steps.

conda env create -f environment.yml
conda activate ccv

git clone https://github.com/castorini/anserini.git --recurse-submodules
cd anserini/
git checkout f42bbbe06e43d8e1ea58a2789f6dc80b0de6612b --recurse-submodules # make sure repository is correct version
mvn clean package appassembler:assemble -Dmaven.test.skip=true

python src/main/python/trec-covid/index_cord19.py --date 2022-02-07 --download --index

cd ..
git clone https://github.com/dwadden/longchecker.git
cd longchecker/
git checkout a77f4b869cc9155132fb395d82d1f84b2e93a195 # make sure repository is correct version

python script/get_checkpoint.py longformer_large_science
python script/get_checkpoint.py covidfact

cd ..

# modify longchecker/longchecker/data.py in order to add truncation when tokenizing
sed -i "s/self.tokenizer(claim + self.tokenizer.eos_token + cited_text)/self.tokenizer(claim + self.tokenizer.eos_token + cited_text, truncation=True)/g" longchecker/longchecker/data.py
# truncated abstracts might fail sanity check
sed -i "s/assert len(abstract_sent_idx) == len(sentences)/# assert len(abstract_sent_idx) == len(sentences)/g" longchecker/longchecker/data.py
# "args = get_args()" should not be in get_predictions(args)
sed -i '0,/args = get_args()/{/args = get_args()/d}' longchecker/longchecker/predict.py

# allow device to be cpu.
sed -i 's/f\"cuda:{args.device}\"/f\"{args.device}\"/g' longchecker/longchecker/predict.py
sed -i 's/(\"--device\", default=0, type=int)/(\"--device\", default=\"cuda:0\", type=str)/g' longchecker/longchecker/predict.py