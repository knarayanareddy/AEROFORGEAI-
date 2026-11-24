# Reference bundle

`aeroforge_cep_wedge_t10_M5p5.zip` — the production-grid (360 × 220) CEP bundle.

- 4,870 kB, sha256 `49bc2f2b876212c62c763ddefe5e991696f831cc1875e52863b200ae265d90ba`
- Verified with `python3 oracle/verify_bundle.py`: all 5 manifest hashes match,
  `verdict=PASS beta_error=1.618%`.
- Not committed (it is 4.8 MB of regenerable output). Rebuild with
  `npx tsx scripts/build-reference-bundle.ts` and verify with
  `python3 oracle/verify_bundle.py reference_bundle.zip`.
