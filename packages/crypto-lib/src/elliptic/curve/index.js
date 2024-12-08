/**
 * LICENSE
 * This software is licensed under the MIT License.
 *
 * Copyright Fedor Indutny, 2014.
 * */
'use strict';

import Base from './base';
import Short from './short';
import Mont from './mont';
import Edwards from './edwards';
var curve = {};

curve.base = Base;
curve.short = Short;
curve.mont = Mont;
curve.edwards = Edwards;

export default curve
