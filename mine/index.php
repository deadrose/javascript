<?php
define('ROOT', $_SERVER['DOCUMENT_ROOT']);
$excludes = array('_vinyl', 'templates');

  function getFileList($dir, $recurse=false)
  {
    $retval = array();
    if(substr($dir, -1) != "/") $dir .= "/";

	$relative = str_replace(ROOT, "", $dir);
	if(strpos($relative, '/_vinyl/') !== false || strpos($relative, '/templates/') !== false) { echo $relative; return $retval; }

    $d = @dir($dir) or die("oops!!");
    while(false !== ($entry = $d->read())) {
if($entry[0] == ".") continue;
if(is_dir("$dir$entry")) {
$retval[] = "$relative$entry/";
if($recurse && is_readable("$dir$entry/")) {
$retval = array_merge($retval, getFileList("$dir$entry/", true));
}
} elseif(is_readable("$dir$entry")) {
$retval[] = "$relative$entry";
}
}
$d->close();

return $retval;
}

print_r(getFileList(ROOT, true));

?>