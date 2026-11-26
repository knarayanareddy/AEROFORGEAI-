# Slurm — NOT RUN, NO CLUSTER

Everything in this directory is **untested against a real Slurm controller**.
There is no cluster to submit to from this environment, so nothing here has been
submitted, queued, or completed. It is a starting point that encodes the
decisions a person would otherwise have to rediscover, not a working adapter.

## What is here

| File | Purpose |
|---|---|
| `su2-inlet.sbatch` | Batch script that runs the Phase 3 case on one node |
| `submit.sh` | Wrapper that validates inputs, submits, and polls to completion |

## What is deliberately missing

- **No `sbatch`-specific extension** (`.sbatch` is a convention, not a syntax).
  Slurm does not care about the extension; keeping it makes the file findable.
- **No `#SBATCH --array`** batch sweep. The parameter sweep is a design decision
  about how many cores each point needs, and guessing it produces a job array
  that either thrashes or sits idle.
- **No container integration.** Phase 5 §2 suggests a container for the SU2
  binary; wiring `--container` directives in before the image exists would be
  speculative. The script assumes `SU2_CFD` is on `PATH` in the job environment.
- **No accounting or QoS settings.** These are site-specific and inventing them
  would produce a script that fails on first submission for a reason unrelated
  to this project.

## Why a wrapper script and not just the sbatch file

`submit.sh` exists so the failure modes are explicit: a wrong path, a missing
mesh, or a partition that does not exist should fail at submission with a
readable message, not as a job that dies 40 minutes later with exit code 1 and
an empty log.

## The honest status

Untested. If you run this and it works, delete this sentence and record the
Slurm version, the partition, and the wall time in the README. If it does not
work, the error is almost certainly in the `#SBATCH` directives, which are the
part most dependent on local configuration.
