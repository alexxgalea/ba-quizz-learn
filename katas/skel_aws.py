# Referințele de schelet pentru modulul aws.
# Fiecare secțiune „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_aws.py.

# === s-aws-presign ===
import boto3
from botocore.config import Config


def presign(
    method, bucket, key,
    expires=300, region="eu-central-1",
):
    # SigV4 explicit
    cfg = Config(signature_version="s3v4")
    s3 = boto3.client(
        "s3",
        region_name=region,
        config=cfg,
    )
    args = {"Bucket": bucket, "Key": key}
    # local: fără apel spre AWS
    return s3.generate_presigned_url(
        method,  # get_object / put_object
        Params=args,
        ExpiresIn=expires,  # secunde
    )
# === end ===
