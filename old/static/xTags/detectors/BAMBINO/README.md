###BAMBINO

`<detector-BAMBINO>` inherits all the standard functionality from `xDetectorTemplate` and `setupDetector`.

####Attributes
 - `MIDAS`: host:port of the MIDAS experiment the HV frontends for this detector are living at.
 - `config`: JSON string arranged as follows:
 ```
{
	'upstream' : <array of detectors, innermost to outermost>
	'downstream' : <array of detectors, innermost to outermost>
}
 ```
 where at least one of `upstream` and `downstream` must be declared as an array of strings of detector types in increasing array position; for example, `'upstream' : ['S3', 'S3']` would place S3 detectors upstream of the target at positions D and E.  A falsey value will leave the corresponding position empty.