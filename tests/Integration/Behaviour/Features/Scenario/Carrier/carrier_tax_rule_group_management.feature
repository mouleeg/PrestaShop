# ./vendor/bin/behat -c tests/Integration/Behaviour/behat.yml -s carrier --tags carrier-tax-rule-group-management
@restore-all-tables-before-feature
@reset-downloads-after-feature
@reset-img-after-feature
@carrier-tax-rule-group-management
Feature: Carrier Tax Rule Group management
  PrestaShop allows BO users to manage carrier for shipping
  As a BO user
  I must be able to create, edit and delete carrier's tax rule group

  Background:
    Given group "visitor" named "Visitor" exists
    Given group "guest" named "Guest" exists

  Scenario: Partially editing carrier with tax rule group
    When I create carrier "carrier1" with specified properties:
      | name             | Carrier 1                          |
      | grade            | 1                                  |
      | trackingUrl      | http://example.com/track.php?num=@ |
      | position         | 2                                  |
      | active           | true                               |
      | max_width        | 1454                               |
      | max_height       | 1234                               |
      | max_depth        | 1111                               |
      | max_weight       | 3864                               |
      | group_access     | visitor, guest                     |
      | delay[en-US]     | Shipping delay                     |
      | shippingHandling | false                              |
      | isFree           | false                              |
      | shippingMethod   | weight                             |
      | rangeBehavior    | disabled                           |
    When I set tax rule for carrier "carrier1" called "newCarrier1" with specified properties:
      | taxRuleGroup | US-AZ Rate (6.6%) |
    Then carrier "carrier1" should have the following properties:
      | name         | Carrier 1 |
      | taxRuleGroup |           |
    And carrier "newCarrier1" should have the following properties:
      | name         | Carrier 1         |
      | taxRuleGroup | US-AZ Rate (6.6%) |

  Scenario: Partially editing carrier with wrong tax rule group
    When I create carrier "carrier1" with specified properties:
      | name             | Carrier 1                          |
      | grade            | 1                                  |
      | trackingUrl      | http://example.com/track.php?num=@ |
      | position         | 2                                  |
      | active           | true                               |
      | max_width        | 1454                               |
      | max_height       | 1234                               |
      | max_depth        | 1111                               |
      | max_weight       | 3864                               |
      | group_access     | visitor, guest                     |
      | delay[en-US]     | Shipping delay                     |
      | shippingHandling | false                              |
      | isFree           | false                              |
      | shippingMethod   | weight                             |
      | rangeBehavior    | disabled                           |
    When I set tax rule for carrier "carrier1" called "newCarrier1" with specified properties:
      | taxRuleGroup | wrongTaxId |
    Then I should get error that tax rules group does not exist
