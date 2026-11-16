# User journeys for Claude to implement as automated functional tests

Feature: Tower floor picking
Scenario: Building has 12 real accessible floor targets
Given the exterior scene has loaded
When I open floor picker
Then Ground, residential floors 01 through 09, Wellness 10 and Dining 11 are available
And floor selection shows a coherent correctly highlighted level
And selecting floor 10 never shows unit A or B.

Feature: Apartment room and finish editing
Scenario: User changes actual floor material, navigates and returns
Given I have selected Floor 04 and Unit 04A
And I entered the living room
When I choose the flooring surface
And I switch from Ivory Porcelain to Engineered Oak in an allowed dry interior
Then the real 3D floor texture/roughness changes in that room
And material information shows concept sample status
And switching room and returning preserves Engineered Oak
And Undo restores Ivory Porcelain.

Feature: Material package coherence
Scenario: Applying preset updates the correct scene and board
Given Unit 04A with an overridden kitchen cabinet
When I choose Walnut Harmony preset
Then all intended slot IDs update to the package
And the UI shows which overrides were overwritten
And the finish board lists the true effective choices
And gallery stills not matching those exact choices are marked representative.

Feature: Amenity exploration
Scenario: Pool and restaurant are not apartments
Given I am at tower exterior
When I select 10
Then I can choose gym/pool/wellness zones, not a residential unit
When I return and select 11
Then I can choose café/restaurant/panoramic terrace
And shisha is clearly described as concept/subject to approval if shown.

Feature: Responsive localization
Scenario: Arabic visitor from narrow phone
Given reduced-motion is enabled and locale is Arabic
When I launch on a 360px viewport
Then the primary Explore control is in view
And floor selection works via tap, not hover
And material inspector is usable as a bottom sheet
And numeric labels, RTL and print summary remain readable.

Feature: Honest inquiry
Scenario: No backend is configured
Given I have customized Unit 04A
When I fill an inquiry form and submit
Then validation runs
And a truthful local-only confirmation appears
And no success message claims contact with a real company.

Feature: Graceful failure
Scenario: WebGL unavailable
Given GPU WebGL is disabled or a scene asset fails
When I open building explorer
Then I see a useful 2D floor selector/gallery fallback
And can inspect summary and finish info without a blank page.
