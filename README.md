# atess-power-flow-card
## Power flow card for Atess systems monitored via HomeAssistant
Step 1: add atess-power-flow-card.js into HomeAssistant folder: config/www/
Step 2: load module into HomeAssistant:
        - navigate to settings
                      dashboards
        - click three dots on top right of page
        - click on "Resources"
        - click on "Add Resource" (bottom right)
        - paste into URL: /local/atess-power-flow-card.js?v=1
                        ### ?v=n 
                        ### n = main javascript edition 
        - Resource Type: "JavaScript module"
        - click save
        - close and reopen HomeAssistant / web page
        - add manual card and paste Yaml file
        - input corresponding entities
        - save card