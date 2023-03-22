#!/usr/bin/env bash

set -e
export DEEPCHECKS_APP_TAG="${DEEPCHECKS_APP_TAG:-latest-release}"

DEEPCHECKS_SECRET=$(head -c 28 /dev/urandom | sha224sum -b | head -c 56)
export DEEPCHECKS_SECRET

OS=$(uname | awk '{print tolower($0)}')
YUM_CMD=$(which yum || echo '')
APT_GET_CMD=$(which apt-get || echo '')

# Check if the OS is Mac of Linux
if ! [[ "$OS" == *darwin* || "$OS" == *linux* ]]; then
  echo "Unfortunately, Deepchecks can only be deployed on MacOS or Linux systems at the moment"
  exit 0
fi

# Talk to the user
echo "Welcome to the single instance Deepchecks installer 🚀"
echo ""
echo "⚠️  You really need 4gb or more of memory to run this stack ⚠️"
echo ""

if ! [ -z "$1" ]
then
export DEEPCHECKS_APP_TAG=$1
else
echo "What version of Deepchecks would you like to install? (We default to 'latest-release')"
echo "You can check out available versions here: https://gallery.ecr.aws/y1h3v2p7/monitoring"
read -r DEEPCHECK_APP_TAG_READ
if [ -z "$DEEPCHECK_APP_TAG_READ" ]
then
    echo "Using default and installing $DEEPCHECKS_APP_TAG"
else
    export DEEPCHECKS_APP_TAG=$DEEPCHECKS_APP_TAG_READ
    echo "Using provided tag: $DEEPCHECKS_APP_TAG"
fi
fi
echo ""
if ! [ -z "$2" ]
then
export DOMAIN=$2
else
echo "Let's get the exact domain Deepchecks will be installed on"
echo "Make sure that you have a Host A DNS record pointing to this instance!"
echo "This will be used for TLS 🔐"
echo "ie: test.deepchecks.net (NOT an IP address)"
read -r DOMAIN
export DOMAIN=$DOMAIN
fi
echo "Ok we'll set up certs for https://$DOMAIN"
echo ""
echo "We will need sudo access so the next question is for you to give us superuser access"
echo "Please enter your sudo password now:"
sudo echo ""
echo "Thanks! 🙏"
echo ""
echo "Ok! We'll take it from here 🚀"

echo "Making sure any stack that might exist is stopped"
sudo -E docker-compose -f docker-compose.yml stop &> /dev/null || true

# send log of this install for continued support!
#curl -o /dev/null -L --header "Content-Type: application/json" -d "{
#    \"api_key\": \"sTMFPsFhdP1Ssg\",
#    \"distinct_id\": \"${DOMAIN}\",
#    \"properties\": {\"domain\": \"${DOMAIN}\"},
#    \"type\": \"capture\",
#    \"event\": \"magic_curl_install_start\"
#}" https://app.dc.com/batch/ &> /dev/null

GIT_EXIST=$(which git || echo '')

# update apt cache
if [[ ! -z $YUM_CMD ]]; then
  echo "Grabbing latest yum caches"
  sudo yum update
  if [[ -z $GIT_EXIST ]]; then
    sudo yum install -y git
  fi;
elif [[ ! -z $APT_GET_CMD ]]; then
  echo "Grabbing latest apt-get caches"
  sudo apt-get update
    if [[ -z $GIT_EXIST ]]; then
      sudo apt-get install -y git
    fi;
fi;


# clone deepchecks
echo "Installing Deepchecks ❤️ from Github"
# try to clone - if folder is already there pull latest for that branch
git clone https://github.com/deepchecks/mon.git &> /dev/null || true
cd mon
git pull
cd ..

if [ -n "$3" ]
then
export TLS_BLOCK="acme_ca https://acme-staging-v02.api.letsencrypt.org/directory"
fi

# rewrite caddyfile
rm -f Caddyfile
envsubst > Caddyfile <<EOF
{
$TLS_BLOCK
}
$DOMAIN:8443 {
    reverse_proxy http://casdoor:4545 {
        header_up Host {upstream_hostport}
        header_up X-Real-IP {remote_host}
    }
}
$DOMAIN, :80, :443 {
reverse_proxy http://app:8000
}
EOF

# Write .env file
envsubst > .env <<EOF
DEEPCHECKS_SECRET=$DEEPCHECKS_SECRET
DOMAIN=$DOMAIN
EOF

# setup docker
echo "Setting up Docker"
DOCKER_EXIST=$(which docker || echo '')

if [[ -z $DOCKER_EXIST ]]; then
  echo "Installing Docker"
  if [[ "$OS" == *linux* ]]; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh ./get-docker.sh --dry-run
  elif [[ "$OS" == *darwin* ]]; then
    echo "Cannot install docker automatically, please follow the instructions here: https://docs.docker.com/desktop/install/mac-install/"
    exit 0
  fi
fi


# setup docker-compose
DOCKER_COMPOSE_EXIST=$(which docker-compose || echo '')
if [[ -z $DOCKER_COMPOSE_EXIST ]]; then
  echo "Setting up Docker Compose"
  if [[ $(uname -m) == 'arm64' ]]; then
    ARCH='aarch64'
  else
    ARCH=$(uname -m)
  fi;
  sudo curl -L "https://github.com/docker/compose/releases/download/v2.13.0/docker-compose-$(uname -s)-$ARCH" -o /usr/local/bin/docker-compose || true
  sudo chmod +x /usr/local/bin/docker-compose
fi;

# enable docker without sudo
if [[ "$OS" == *linux* ]]; then
  sudo usermod -aG docker "${USER}" || true
fi;

# start up the stack
echo "Configuring Docker Compose...."
rm -f docker-compose.yml
cp mon/docker-compose-oss.yml docker-compose-oss.yml.tmpl
envsubst <  mon/oss-conf.env > oss-conf.env
cp -a mon/bin/. bin/
envsubst < docker-compose-oss.yml.tmpl > docker-compose-oss.yml
envsubst < bin/casbin_conf/app.conf.tmpl > bin/casbin_conf/app.conf
envsubst < bin/casbin_conf/init_data/init_data.json.tmpl > bin/casbin_conf/init_data/init_data.json

rm docker-compose-oss.yml.tmpl bin/casbin_conf/app.conf.tmpl

echo "Starting the stack!"
sudo -E docker-compose -f docker-compose-oss.yml up -d --build

echo "We will need to wait ~5-10 minutes for things to settle down, migrations to finish, and TLS certs to be issued"
echo ""
echo "⏳ Waiting for Deepchecks to boot (this will take a few minutes)"
bash -c 'while [[ "$(curl -s -k -o /dev/null -w ''%{http_code}'' https://$DOMAIN/api/v1/health-check)" != "200" ]]; do sleep 5; done'
echo "⌛️ Deepchecks looks up!"
echo ""
echo "🎉🎉🎉  Done! 🎉🎉🎉"
# send log of this install for continued support!
#curl -o /dev/null -L --header "Content-Type: application/json" -d "{
#    \"api_key\": \"sTMFPsFhdP1Ssg\",
#    \"distinct_id\": \"${DOMAIN}\",
#    \"properties\": {\"domain\": \"${DOMAIN}\"},
#    \"type\": \"capture\",
#    \"event\": \"magic_curl_install_complete\"
#}" https://app.dc.com/batch/ &> /dev/null
echo ""
echo "To stop the stack run 'docker-compose stop'"
echo "To start the stack again run 'docker-compose start'"
echo "If you have any issues at all delete everything in this directory and run the curl command again"
echo ""
echo "Deepchecks will be up at the location you provided!"
echo "https://${DOMAIN}"
echo ""
echo "Thanks for installing! You earned this: 🥇"