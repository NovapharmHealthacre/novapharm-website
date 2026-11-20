#!/usr/bin/env python3
"""Fail-closed local H2/STO-3G OpenFermion/PySCF reference.
No package installation, network, clinical inference or quantum hardware access.
Execution must be explicitly requested in an independently approved offline environment.
"""
import argparse
import hashlib
from importlib import metadata
import json
import math
from pathlib import Path
import sys
from tempfile import TemporaryDirectory

DEPENDENCIES = ("numpy", "pyscf", "openfermion", "openfermionpyscf")
GEOMETRY = (("H", (0.0, 0.0, 0.0)), ("H", (0.0, 0.0, 0.7414)))
BASIS = "sto-3g"
MAX_SPIN_ORBITALS = 4
FCI_TOLERANCE_HARTREE = 1e-6

def dependency_versions():
    versions = {}
    for name in DEPENDENCIES:
        try:
            versions[name] = metadata.version(name)
        except metadata.PackageNotFoundError:
            versions[name] = None
    return versions

def descriptor():
    return {"molecule": "H2", "geometryAngstrom": [list(x) for x in GEOMETRY],
            "basis": BASIS, "charge": 0, "multiplicity": 1,
            "targetElectronCount": 2, "maximumSpinOrbitals": MAX_SPIN_ORBITALS,
            "fullCiComparisonToleranceHartree": FCI_TOLERANCE_HARTREE}

def perform(versions):
    if any(value is None for value in versions.values()):
        raise RuntimeError("No H2 calculation executed: offline dependencies not installed")
    import numpy as np
    from openfermion import MolecularData, get_fermion_operator, jordan_wigner, get_sparse_operator
    from openfermionpyscf import run_pyscf

    with TemporaryDirectory(prefix="npi-quantum-h2-") as temp_dir:
        # Explicit tmp location prevents writing molecular files under site-packages.
        molecule = MolecularData(list(GEOMETRY), BASIS, 1, 0,
                                 filename=str(Path(temp_dir) / "h2_sto3g_local"))
        molecule = run_pyscf(molecule, run_scf=True, run_fci=True)
        if molecule.n_qubits != MAX_SPIN_ORBITALS or molecule.n_electrons != 2:
            raise RuntimeError("Unexpected H2 basis or electron count; refusing to analyse")
        if molecule.fci_energy is None or molecule.hf_energy is None:
            raise RuntimeError("Independent classical reference did not converge")
        operator = jordan_wigner(get_fermion_operator(molecule.get_molecular_hamiltonian()))
        matrix = get_sparse_operator(operator, n_qubits=MAX_SPIN_ORBITALS).toarray()
        if matrix.shape != (16, 16) or not np.allclose(matrix, matrix.conjugate().T, atol=1e-10):
            raise RuntimeError("Unbounded or non-Hermitian qubit Hamiltonian")
        sector = [i for i in range(16) if i.bit_count() == 2]
        restricted = matrix[np.ix_(sector, sector)]
        # Compare *total* energies, both including nuclear repulsion.
        diagonalization_energy = float(np.linalg.eigvalsh(restricted)[0])
        full_ci_energy = float(molecule.fci_energy)
        hartree_fock_energy = float(molecule.hf_energy)
        nuclear_repulsion = float(molecule.nuclear_repulsion)
        if not all(map(math.isfinite, (diagonalization_energy, full_ci_energy, hartree_fock_energy, nuclear_repulsion))):
            raise RuntimeError("Non-finite energy")
        discrepancy = abs(diagonalization_energy - full_ci_energy)
        if discrepancy > FCI_TOLERANCE_HARTREE or hartree_fock_energy + FCI_TOLERANCE_HARTREE < full_ci_energy:
            raise RuntimeError("OpenFermion/PySCF independent classical energy mismatch")
        manifest = {"schemaVersion": "npi.quantum-h2-offline.v1", "researchOnly": True,
                    "simulationOnly": True, "quantumHardwareUsed": False,
                    "clinicalUsePermitted": False, "productionApproved": False,
                    "independentlyReplicated": False, "sourceRightsReviewed": False,
                    "scientificConfiguration": descriptor(), "dependencies": versions,
                    "method": "pySCF-HF-and-FCI-versus-OpenFermion-Jordan-Wigner-2-electron-sector",
                    "qubits": MAX_SPIN_ORBITALS, "sectorDimension": len(sector),
                    "hartreeFockTotalHartree": hartree_fock_energy,
                    "fullCiTotalHartree": full_ci_energy,
                    "jordanWignerTotalHartree": diagonalization_energy,
                    "nuclearRepulsionHartree": nuclear_repulsion,
                    "absoluteEnergyDiscrepancyHartree": discrepancy,
                    "sourceSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    # No file or patient data is retained; JSON stdout is an unverified local observation.
    return manifest

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Run approved local H2 reference calculation")
    parser.add_argument("--confirm-local-only", action="store_true", help="Confirm no external datasets or cloud resources are authorized")
    args = parser.parse_args(argv)
    versions = dependency_versions()
    if not args.execute:
        print(json.dumps({"status": "preflight-only", "wouldExecute": False,
                          "configuration": descriptor(), "dependencyVersions": versions,
                          "missingDependencies": [k for k,v in versions.items() if v is None],
                          "productionApproved": False}, sort_keys=True))
        return 0
    if not args.confirm_local_only:
        print("Refused: --confirm-local-only required; use preflight by default", file=sys.stderr)
        return 2
    try:
        print(json.dumps(perform(versions), sort_keys=True, separators=(",", ":")))
    except (RuntimeError, ImportError) as error:
        print("Refused or failed: " + str(error), file=sys.stderr)
        return 2
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
