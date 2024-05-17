
# Automated Cue Delivery Software
This is a public backup of a Chrome App which automates the scheduling of audio cues for multiple devices and contains functionality for state-dependent conditioned stimulus delivery using the instantaneous cardiovascular state of the animal. Read the paper here: https://pubmed.ncbi.nlm.nih.gov/33819454/

These cues can be scheduled randomly or on a fixed interval. The novelty of this app is its use of animal telemetry though a socket connection with Ponemah™. This allows tone delivery to occur only when the animal is within in a set blood pressure range. Basing stimuli on a physiological state eliminates confounds and opens the door for more innovative experimental setups.

![image](https://github.com/bjamturley/AutomatedCueDelivery/assets/8573191/7ba3eb5a-ba12-4e35-a380-fb0f8c7bcf6a)


**DISCLAIMERS**

Chrome Apps are no longer supported. However, the software is written in JavaScript/HTML and can easily be used as a web app. The one caveat is that it requires a socket connection for the telemetry software, hence the initial use of the Chrome App framework.

I built this app my Sophomore year of college. The functionality is solid, but there is no guarantee the code incorporates formatting standards or implements proper unit testing. The last update was November 16, 2019.
