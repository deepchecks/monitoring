#!/bin/bash
brew list aquasecurity/trivy/trivy || brew install aquasecurity/trivy/trivy
docker build -t deepchecks/mon .
trivy image --scanners vuln --severity CRITICAL,HIGH,MEDIUM --ignore-unfixed  deepchecks/mon