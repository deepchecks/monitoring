#!/usr/bin/env bash

set -e
export DEEPCHECKS_APP_TAG="${DEEPCHECKS_APP_TAG:-latest-release}"

DEEPCHECKS_SECRET=$(head -c 28 /dev/urandom | sha224sum -b | head -c 56)
export DEEPCHECKS_SECRET

OS=$(uname | awk '{print tolower($0)}')
ARCH=$(uname -m)
YUM_CMD=$(which yum || echo '')
APT_GET_CMD=$(which apt-get || echo '')

# Check if the OS is Mac of Linux
if ! [[ "$OS" == *darwin* || "$OS" == *linux* ]]; then
  echo "Unfortunately, Deepchecks can only be deployed on MacOS or Linux systems at the moment"
  exit 0
fi
# Check if ARMv7, then not supported
if [[ "$ARCH" == "armv7l" ]]; then
  echo "Unfortunately, Deepchecks can only be deployed on x86_64 or ARMv8 systems at the moment"
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
echo "What version of Deepchecks would you like to install? (Press enter for latest-release)"
echo "You can check out available versions here: https://gallery.ecr.aws/deepchecks/monitoring"
read -r DEEPCHECKS_APP_TAG_READ
if [ -z "$DEEPCHECKS_APP_TAG_READ" ]
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
echo "This will be used for TLS 🔐 and for the app to know where to redirect to"
echo "ie: test.deepchecks.net (NOT an IP address)"
echo "Please enter the domain name (Press enter for default: localhost)"
read -r DOMAIN
if [ -z "$DOMAIN" ]
then
  export DOMAIN='localhost'
else
  export DOMAIN=$DOMAIN
fi
fi
if [[ $ENABLE_HTTP == 'false' ]]; then
  echo "Ok we'll set up certs for https://$DOMAIN"
fi
echo ""
echo "Do you want to enable http traffic? (This is recommended for local deployments or behind private networks)"
echo "⚠️ HTTPS won't work for localhost or inaccessible domains ⚠️"
echo "Specify true to enable http (Press enter for default: true)"
read -r ENABLE_HTTP
if [ -z "$ENABLE_HTTP" ]
then
  export ENABLE_HTTP='true'
else
  if [[ $ENABLE_HTTP == 'true' ]]; then
    export ENABLE_HTTP='true'
  else
    export ENABLE_HTTP='false'
  fi
fi
echo ""
echo "We will need sudo access so the next question is for you to give us superuser access"
echo "Please enter your sudo password now:"
sudo echo ""
sudo sh -c "export CGO_ENABLED=1"
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

# download deployment files
echo "Installing Deepchecks  ❤️ from Github"
curl -LO https://github.com/deepchecks/monitoring/archive/refs/heads/main.zip
unzip -o main.zip "monitoring-main/deploy/*" -d "."
unzip -o main.zip "monitoring-main/bin/*" -d "."
rm main.zip

if [[ "$OS" == *darwin* ]]; then
  brew install gettext
  brew link --force gettext
fi;

if [ -n "$3" ]
then
export TLS_BLOCK="acme_ca https://acme-staging-v02.api.letsencrypt.org/directory"
fi

# rewrite caddyfile
rm -f Caddyfile
if [[ $ENABLE_HTTP == 'true' ]]; then
  export SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
  envsubst > Caddyfile <<EOF
{
  auto_https disable_redirects
}
$DOMAIN:8443 {
    tls /certs/localhost.crt /certs/localhost.key

    reverse_proxy http://casdoor:4545 {
        header_up Host {upstream_hostport}
        header_up X-Real-IP {remote_host}
    }
}
$DOMAIN, :443 {
    tls /certs/localhost.crt /certs/localhost.key

    reverse_proxy http://app:8000
}
$DOMAIN:80 {
    reverse_proxy http://app:8000
}
EOF
else
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

fi;

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
    sudo sh ./get-docker.sh
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
cp monitoring-main/deploy/docker-compose.yml docker-compose.yml.tmpl
envsubst <  monitoring-main/deploy/oss-conf.env > oss-conf.env
cp -a monitoring-main/bin/. bin/
mv monitoring-main monitoring

envsubst < docker-compose.yml.tmpl > docker-compose.yml
envsubst < bin/casbin_conf/app.conf.tmpl > bin/casbin_conf/app.conf
envsubst < bin/casbin_conf/init_data/init_data.json.tmpl > bin/casbin_conf/init_data/init_data.json

rm docker-compose.yml.tmpl bin/casbin_conf/app.conf.tmpl

echo "Starting the stack!"
# First pull the image to prevent rate throttling from aws ecr
docker pull public.ecr.aws/deepchecks/monitoring:"$DEEPCHECKS_APP_TAG"
if [[ "$OS" == *linux* ]]; then
  sudo -E docker-compose up -d --build
else
  docker-compose up -d --build
fi

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
if [[ $ENABLE_HTTP == 'true' ]]; then
  echo "http://${DOMAIN}"
fi
echo ""
echo "Thanks for installing! You earned this: 🥇"
