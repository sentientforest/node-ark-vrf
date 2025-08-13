#![deny(clippy::all)]

use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
use ark_vrf::reexports::ark_ec::CurveGroup;
use ark_vrf::suites::bandersnatch::*;
use ark_vrf::Output;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use sha2::Sha512;

#[napi(object)]
#[derive(Default)]
pub struct VrfKeyPair {
  pub public_key: String,
  pub secret_key: String,
}

#[napi]
pub fn generate_keypair_from_seed(seed: String) -> VrfKeyPair {
  let secret = Secret::from_seed(seed.as_bytes());
  let public = secret.public();

  // Serialize the keys
  let mut secret_bytes = Vec::new();
  secret.serialize_compressed(&mut secret_bytes).unwrap();

  let mut public_bytes = Vec::new();
  public.serialize_compressed(&mut public_bytes).unwrap();

  VrfKeyPair {
    secret_key: hex::encode(secret_bytes),
    public_key: hex::encode(public_bytes),
  }
}

#[napi]
pub fn vrf_prove(secret_key: String, message: String, aux_data: Option<String>) -> Result<String> {
  let secret_bytes = hex::decode(&secret_key)
    .map_err(|e| Error::from_reason(format!("Invalid secret key hex: {}", e)))?;

  let secret = Secret::deserialize_compressed(&*secret_bytes)
    .map_err(|e| Error::from_reason(format!("Invalid secret key bytes: {}", e)))?;

  let input = Input::new(message.as_bytes())
    .ok_or_else(|| Error::from_reason("Failed to create VRF input"))?;

  let output = secret.output(input);
  let aux_data = aux_data.as_deref().unwrap_or_default().as_bytes();

  use ark_vrf::ietf::Prover;
  let proof = secret.prove(input, output, aux_data);

  let mut proof_bytes = Vec::new();
  proof
    .serialize_compressed(&mut proof_bytes)
    .map_err(|e| Error::from_reason(format!("Failed to serialize proof: {}", e)))?;

  Ok(hex::encode(proof_bytes))
}

#[napi]
pub fn vrf_verify(
  public_key: String,
  message: String,
  proof: String,
  aux_data: Option<String>,
) -> Result<bool> {
  let public_bytes = hex::decode(&public_key)
    .map_err(|e| Error::from_reason(format!("Invalid public key hex: {}", e)))?;

  let public = Public::deserialize_compressed(&*public_bytes)
    .map_err(|e| Error::from_reason(format!("Invalid public key bytes: {}", e)))?;

  let proof_bytes =
    hex::decode(&proof).map_err(|e| Error::from_reason(format!("Invalid proof hex: {}", e)))?;

  let proof: ark_vrf::ietf::Proof<BandersnatchSha512Ell2> =
    ark_vrf::ietf::Proof::deserialize_compressed(&*proof_bytes)
      .map_err(|e| Error::from_reason(format!("Invalid proof bytes: {}", e)))?;

  let input = Input::new(message.as_bytes())
    .ok_or_else(|| Error::from_reason("Failed to create VRF input"))?;

  let aux_data = aux_data.as_deref().unwrap_or_default().as_bytes();

  use ark_vrf::ietf::Verifier;
  let s_h = input.0 * proof.s;
  let c_y = public.0 * proof.c;
  let output = Output::from((s_h - c_y).into_affine());
  Ok(public.verify(input, output, aux_data, &proof).is_ok())
}

#[napi]
pub fn vrf_proof_to_hash(proof: String) -> Result<String> {
  let proof_bytes =
    hex::decode(&proof).map_err(|e| Error::from_reason(format!("Invalid proof hex: {}", e)))?;

  let proof: ark_vrf::ietf::Proof<BandersnatchSha512Ell2> =
    ark_vrf::ietf::Proof::deserialize_compressed(&*proof_bytes)
      .map_err(|e| Error::from_reason(format!("Invalid proof bytes: {}", e)))?;

  // Use SHA-512 to hash the proof bytes
  let mut proof_hash = Vec::new();
  proof
    .serialize_compressed(&mut proof_hash)
    .map_err(|e| Error::from_reason(format!("Failed to serialize proof for hashing: {}", e)))?;

  use sha2::Digest;
  let hash = Sha512::digest(&proof_hash);
  Ok(hex::encode(hash))
}
