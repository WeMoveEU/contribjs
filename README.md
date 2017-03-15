# ContribJS

This extension adds additional JS and CSS files on contribution pages (forms).

## A/B tests

One of the features added by the extension is to perform some A/B testing on the page.
This feature requires [Alephbet](https://github.com/Alephbet/alephbet).

The script contrib.js defines an object `abVariants` which declares the possible tests,
and for each test the variants of that test. The variants can be declared via a dictionary
of pairs (variant name, callback), or via a function that returns such a dictionary.
The variant callback is called when the variant is picked. Also when the variant is picked, 
two custom fields `ab_testing` and `ab_variant` are set with the name of the test and the variant.

