/**
 * Copyright since 2007 PrestaShop SA and Contributors
 * PrestaShop is an International Registered Trademark & Property of PrestaShop SA
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this package in the file LICENSE.md.
 * It is also available through the world-wide-web at this URL:
 * https://opensource.org/licenses/OSL-3.0
 * If you did not receive a copy of the license and are unable to
 * obtain it through the world-wide-web, please send an email
 * to license@prestashop.com so we can send you a copy immediately.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade PrestaShop to newer
 * versions in the future. If you wish to customize PrestaShop for your
 * needs please refer to https://devdocs.prestashop.com/ for more information.
 *
 * @author    PrestaShop SA and Contributors <contact@prestashop.com>
 * @copyright Since 2007 PrestaShop SA and Contributors
 * @license   https://opensource.org/licenses/OSL-3.0 Open Software License (OSL 3.0)
 */

import BigNumber from 'bignumber.js';
import {EventEmitter} from 'events';
import FormObjectMapper, {FormUpdateEvent} from '@components/form/form-object-mapper';
import ProductFormMapping from '@pages/product/edit/product-form-mapping';
import ProductEventMap from '@pages/product/product-event-map';
import {NumberFormatter} from '@app/cldr';

export default class ProductFormModel {
  private eventEmitter: EventEmitter;

  private mapper: FormObjectMapper;

  private precision: number;

  private numberFormatter: NumberFormatter;

  constructor($form: JQuery, eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;

    // Init form mapper
    this.mapper = new FormObjectMapper(
      $form,
      ProductFormMapping,
      eventEmitter,
      {
        modelUpdated: ProductEventMap.productModelUpdated,
        updateModel: ProductEventMap.updatedProductModel,
        modelFieldUpdated: ProductEventMap.updatedProductField,
      },
    );

    // For now we get precision only in the component, but maybe it would deserve a more global configuration
    // BigNumber.set({DECIMAL_PLACES: someConfig}) But where can we define/inject this global config?
    const $priceTaxExcludedInput: JQuery<HTMLElement> | undefined = this.mapper.getInputsFor('price.priceTaxExcluded');
    this.precision = <number>$priceTaxExcludedInput?.data('displayPricePrecision');

    this.numberFormatter = NumberFormatter.build($priceTaxExcludedInput?.data('priceSpecification'));

    // Listens to event for product modification (registered after the model is constructed, because events are
    // triggered during the initial parsing but don't need them at first).
    this.eventEmitter.on(ProductEventMap.updatedProductField, (event: FormUpdateEvent) => this.productFieldUpdated(event));
  }

  getProduct(): any {
    return this.mapper.getModel();
  }

  getBigNumber(modelKey: string): BigNumber | undefined {
    return this.mapper.getBigNumber(`${modelKey}`);
  }

  watch(modelKeys: string | string[], callback: (event: FormUpdateEvent) => void): void {
    this.mapper.watch(modelKeys, callback);
  }

  set(modelKey: string, value: string | number | string[] | undefined): void {
    this.mapper.set(modelKey, value);
  }

  getTaxRatio(): BigNumber {
    const $taxRulesGroupIdInput: JQuery<HTMLElement> | undefined = this.mapper.getInputsFor('price.taxRulesGroupId');

    if (!$taxRulesGroupIdInput) {
      console.error('Could not find tax rules input');
      return new BigNumber(NaN);
    }

    const isTaxEnabled = $taxRulesGroupIdInput.data('taxEnabled');

    if (!isTaxEnabled) {
      return new BigNumber(1);
    }

    const $selectedTaxOption = $(':selected', $taxRulesGroupIdInput);

    return this.getTaxRatioFromInput($selectedTaxOption);
  }

  getEcoTaxRatio(): BigNumber {
    const $ecotaxTaxExcluded = this.mapper.getInputsFor('price.ecotaxTaxExcluded');

    // If no ecotax field found return 1 this way it has no impact in computing
    if (!$ecotaxTaxExcluded) {
      return new BigNumber(1);
    }

    return this.getTaxRatioFromInput($ecotaxTaxExcluded);
  }

  getPriceTaxExcluded(): BigNumber {
    return this.mapper.getBigNumber('price.priceTaxExcluded') ?? new BigNumber(0);
  }

  displayPrice(price: BigNumber): string {
    return this.numberFormatter.format(price.toNumber());
  }

  removeTax(price: BigNumber): string {
    const taxRatio = this.getTaxRatio();

    if (taxRatio.isNaN()) {
      return price.toFixed(this.precision);
    }

    return price.dividedBy(taxRatio).toFixed(this.precision);
  }

  addTax(price: BigNumber): string {
    const taxRatio = this.getTaxRatio();

    if (taxRatio.isNaN()) {
      return price.toFixed(this.precision);
    }

    return price.times(taxRatio).toFixed(this.precision);
  }

  /**
   * Handles modifications that have happened in the product
   */
  private productFieldUpdated(event: FormUpdateEvent): void {
    this.updateProductPrices(event);
  }

  /**
   * Specific handler for modifications related to the product price
   */
  private updateProductPrices(event: FormUpdateEvent): void {
    const pricesFields = [
      'price.priceTaxIncluded',
      'price.priceTaxExcluded',
      'price.taxRulesGroupId',
      'price.unitPriceTaxIncluded',
      'price.unitPriceTaxExcluded',
      'price.ecotaxTaxIncluded',
      'price.ecotaxTaxExcluded',
    ];

    if (!pricesFields.includes(event.modelKey)) {
      return;
    }

    const taxRatio = this.getTaxRatio();

    if (taxRatio.isNaN()) {
      return;
    }

    const priceTaxIncluded = this.mapper.getBigNumber('price.priceTaxIncluded') ?? new BigNumber(0);
    const ecoTaxRatio = this.getEcoTaxRatio();
    const ecotaxTaxIncluded = this.mapper.getBigNumber('price.ecotaxTaxIncluded') ?? new BigNumber(0);

    // eslint-disable-next-line default-case
    switch (event.modelKey) {
      // Regular retail price
      case 'price.priceTaxIncluded': {
        this.mapper.set('price.priceTaxExcluded', this.removeTax(priceTaxIncluded.minus(ecotaxTaxIncluded)));
        break;
      }
      case 'price.priceTaxExcluded': {
        const priceTaxExcluded = this.mapper.getBigNumber('price.priceTaxExcluded') ?? new BigNumber(0);
        this.mapper.set(
          'price.priceTaxIncluded',
          priceTaxExcluded.times(taxRatio).plus(ecotaxTaxIncluded).toFixed(this.precision),
        );
        break;
      }

      // Ecotax values
      case 'price.ecotaxTaxIncluded': {
        this.mapper.set(
          'price.ecotaxTaxExcluded',
          ecotaxTaxIncluded.dividedBy(ecoTaxRatio).toFixed(this.precision),
        );
        break;
      }
      case 'price.ecotaxTaxExcluded': {
        const ecotaxTaxExcluded = this.mapper.getBigNumber('price.ecotaxTaxExcluded') ?? new BigNumber(0);
        const newEcotaxTaxIncluded = ecotaxTaxExcluded.times(ecoTaxRatio);
        this.mapper.set('price.ecotaxTaxIncluded', newEcotaxTaxIncluded.toFixed(this.precision));
        this.mapper.set('price.priceTaxExcluded', this.removeTax(priceTaxIncluded.minus(newEcotaxTaxIncluded)));
        break;
      }

      // Unit price
      case 'price.unitPriceTaxIncluded': {
        const unitPriceTaxIncluded = this.mapper.getBigNumber('price.unitPriceTaxIncluded') ?? new BigNumber(0);
        this.mapper.set('price.unitPriceTaxExcluded', this.removeTax(unitPriceTaxIncluded));
        break;
      }
      case 'price.unitPriceTaxExcluded': {
        const unitPriceTaxExcluded = this.mapper.getBigNumber('price.unitPriceTaxExcluded') ?? new BigNumber(0);
        this.mapper.set('price.unitPriceTaxIncluded', this.addTax(unitPriceTaxExcluded));
        break;
      }

      case 'price.taxRulesGroupId': {
        const priceTaxExcluded = this.mapper.getBigNumber('price.priceTaxExcluded') ?? new BigNumber(0);
        this.mapper.set('price.priceTaxIncluded', this.addTax(priceTaxExcluded));
        const unitPriceTaxExcluded = this.mapper.getBigNumber('price.unitPriceTaxExcluded') ?? new BigNumber(0);
        this.mapper.set('price.unitPriceTaxIncluded', this.addTax(unitPriceTaxExcluded));
        break;
      }
    }
  }

  private getTaxRatioFromInput($taxInput: JQuery): BigNumber {
    let taxRate;
    try {
      taxRate = new BigNumber($taxInput.data('taxRate'));
    } catch (error) {
      taxRate = new BigNumber(NaN);
    }
    if (taxRate.isNaN()) {
      taxRate = new BigNumber(0);
    }

    return taxRate.dividedBy(100).plus(1);
  }
}
