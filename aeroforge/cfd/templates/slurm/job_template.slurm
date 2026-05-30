#!/bin/bash
# AeroForge CFD — reference Slurm template (the SlurmExecutor fills these in).
#SBATCH --job-name=aeroforge_cfd
#SBATCH --partition={partition}
#SBATCH --nodes={nodes}
#SBATCH --ntasks={cores}
#SBATCH --time={time_limit}
#SBATCH --output=slurm-%j.out

set -e
decomposePar -force
mpirun -np {cores} {solver} -parallel
reconstructPar -latestTime
