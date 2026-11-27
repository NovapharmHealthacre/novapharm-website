import {one} from '../data/database.mjs';
import {createWmsPriceBridge} from './wms-price-bridge-service.mjs';
import {invokePricePublisher} from './wms-price-invoke.mjs';
export const {inspectWmsPrice,publishWmsPrice}=createWmsPriceBridge({
 loadDraft:sku=>one('SELECT revision,draft_json FROM wms_commerce_drafts WHERE sku = ?',sku),
 invokePublisher:invokePricePublisher
});
