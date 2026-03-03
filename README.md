# formAddin
The repository contains 3 addins. They are various perception view of forms that can be created and used for fleets. There is admin view where forms can be created and data can be extracted from filled forms. Map view to see last filled form. Driver view to fill the forms out.

# Tools used:
I ended up using the Gemini Gem for the UI portion of the addin. These were the prompts that I used: \
For the admin view of the addin:create a page addin that allows people to create different kind of forms, the form should allow users to set the field name and expected data type. Storage api should be used to save the details recorded.\
\
For the driver portion of the addin:\
create a drive addin that allows drivers to fill out the form and save the data to storage apis. Driver should be able to select the form. there should be auto fill options for vehicle and current datetime.\
\
For the map addin: \
I used the tooltip addin as a template and edited it: https://github.com/Geotab/sdk-map-addin-samples/tree/master/tooltip
