#!/usr/bin/env python3
"""Validate reviewed matcher data and print a reproducibility manifest."""

import argparse
import json
from matcher_data import DatasetValidationError, validate_dataset


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate reviewed HireLabs matcher train/dev JSONL data.")
    parser.add_argument("--data-dir", required=True, help="Dataset directory containing pairs/ and raw/")
    args = parser.parse_args()
    try:
        _train_rows, _dev_rows, manifest = validate_dataset(args.data_dir)
    except DatasetValidationError as error:
        parser.error(str(error))
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
