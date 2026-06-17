import { NodeInterfaceType } from '@baklavajs/interface-types';

export const imageType   = new NodeInterfaceType('image');
export const textType    = new NodeInterfaceType('text');
export const fileType    = new NodeInterfaceType('file');
export const boolType    = new NodeInterfaceType('boolean');
export const numberType  = new NodeInterfaceType('number');
export const jsonType    = new NodeInterfaceType('json');

export const ALL_PORT_TYPES = [imageType, textType, fileType, boolType, numberType, jsonType];
