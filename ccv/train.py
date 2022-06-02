"""Script to reproduce the training of the longchecker model to perform stance detection between rationales"""

import argparse
import sys

import pandas as pd

sys.path.append("longchecker/")
sys.path.append("longchecker/longchecker/")
import pytorch_lightning as pl
import torch
from longchecker.data import Collator, LongCheckerDataset, get_tokenizer
from longchecker.model import LongCheckerModel
from torch.nn import functional as F
from torch.utils.data import DataLoader, random_split

pl.seed_everything(0)


def get_args():
    args = argparse.Namespace()
    args.checkpoint_path = "longchecker/checkpoints/covidfact.ckpt"
    args.checkpoint_path_output = "longchecker/checkpoints/covidfact_trained"
    args.data_path = "data/training.csv"
    args.batch_size = 1
    args.devices = 1
    args.device_type = "gpu"
    args.num_workers = 4
    args.num_epochs = 10
    return args


args = get_args()
df = pd.read_csv(args.data_path)


class LongCheckerModelStanceOnly(LongCheckerModel):
    def __init__(self, hparams):
        super().__init__(hparams)
        self.metrics = None

    def training_step(self, batch, batch_idx):
        "Multi-task loss on a batch of inputs."
        res = self(batch["tokenized"], batch["abstract_sent_idx"])

        # Loss for label prediction.
        loss = F.cross_entropy(res["label_logits"], batch["label"])

        self.log("loss", loss)

        return loss

    def validation_step(self, batch, batch_idx):
        "Multi-task loss on a batch of inputs."
        res = self(batch["tokenized"], batch["abstract_sent_idx"])

        # Loss for label prediction.
        loss = F.cross_entropy(res["label_logits"], batch["label"])

        self.log("val_loss", loss)

        return loss

    def validation_epoch_end(self, outs):
        pass

    def test_step(self, batch, batch_idx):
        "Multi-task loss on a batch of inputs."
        res = self(batch["tokenized"], batch["abstract_sent_idx"])

        # Loss for label prediction.
        loss = F.cross_entropy(res["label_logits"], batch["label"])

        self.log("test_loss", loss)

        return loss

    def test_epoch_end(self, outs):
        pass


class LongCheckerDatasetStanceOnly(LongCheckerDataset):
    "Stores and tensorizes a list of claim / document entries."

    def __getitem__(self, idx):
        "Tensorize a single claim / abstract pair."
        entry = self.entries[idx]
        res = {
            "claim_id": entry["claim_id"],
            "abstract_id": entry["abstract_id"],
            "label": entry["label"],
        }
        tensorized = self._tensorize(**entry["to_tensorize"])
        res.update(tensorized)
        return res


class CollatorStanceOnly(Collator):
    def __init__(self, tokenizer):
        super().__init__(tokenizer)
        self.label_map = {"contradict": 0, "unrelated": 1, "support": 2}

    def __call__(self, batch):
        "Collate all the data together into padded batch tensors."
        res = {
            "claim_id": self._collate_scalar(batch, "claim_id"),
            "abstract_id": self._collate_scalar(batch, "abstract_id"),
            "label": self._collate_label(batch, "label"),
            "tokenized": self._pad_tokenized([x["tokenized"] for x in batch]),
            "abstract_sent_idx": self._pad_field(batch, "abstract_sent_idx", 0),
        }

        # Make sure the keys match.
        assert res.keys() == batch[0].keys()
        return res

    def _collate_label(self, batch, field):
        res = [self.label_map[x[field]] for x in batch]

        return torch.tensor(res)


model = LongCheckerModelStanceOnly.load_from_checkpoint(
    checkpoint_path=args.checkpoint_path
)

tokenizer = get_tokenizer()

res = []
for index, row in df.iterrows():
    to_tensorize = {"claim": row.r1, "sentences": [row.r2], "title": None}
    entry = {
        "claim_id": index,
        "abstract_id": index,
        "label": row.stance,
        "to_tensorize": to_tensorize,
    }
    res.append(entry)
ds = LongCheckerDatasetStanceOnly(res, tokenizer)
collator = CollatorStanceOnly(tokenizer)

ds = random_split(ds, [len(ds) - int(0.1 * len(ds)), int(0.1 * len(ds))])
dataloader_train = DataLoader(
    ds[0],
    num_workers=args.num_workers,
    batch_size=args.batch_size,
    collate_fn=collator,
    shuffle=False,
    pin_memory=True,
)
dataloader_val = DataLoader(
    ds[1],
    num_workers=args.num_workers,
    batch_size=args.batch_size,
    collate_fn=collator,
    shuffle=False,
    pin_memory=True,
)

checkpoint_callback = pl.callbacks.ModelCheckpoint(
    dirpath=args.checkpoint_path_output, save_top_k=5, monitor="val_loss",
)
trainer = pl.Trainer(
    max_epochs=args.num_epochs,
    callbacks=[checkpoint_callback],
    devices=args.devices,
    accelerator=args.device_type,
)
trainer.fit(model, dataloader_train, dataloader_val)

for checkpoint, score in checkpoint_callback.best_k_models.items():
    print(checkpoint, score)
