<?php

function run_update() {

    $file = 'version.txt';
    $version = file_get_contents($file);
    $versiongithub = exec('curl --silent -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/ProBatou/WebApp/releases/latest | grep -oP '. "'(?<=".'"tag_name": ")[^"]*'."' | sed 's/^v//'");

    exec('wget https://github.com/ProBatou/WebApp/archive/refs/tags/v'.$versiongithub.'.tar.gz');
    exec('tar -xvf *'.$versiongithub.'.tar.gz --strip 1 && rm *'.$versiongithub.'.tar.gz');

    file_put_contents($file, $versiongithub);
}
run_update();

?>