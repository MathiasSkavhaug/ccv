import { init } from './init.js';
import { resize } from './resize.js';

$(window).on('load', function() {
    init();
    resize();
});