/**
 * @author Eugene Zatepyakin / http://inspirit.ru/
 */

(function(global) {
    "use strict";
    //

    var imgproc = (function() {

        var _resample_u8 = function(src, dst, nw, nh) {
            var xofs = [],xofs_count=0;
            var ch=src.channel,w=src.cols,h=src.rows;
            var src_d=src.data,dst_d=dst.data;
            var scale_x = w / nw, scale_y = h / nh;
            var inv_scale_256 = (scale_x * scale_y * 0x10000)|0;
            var dx=0,dy=0,sx=0,sy=0,sx1=0,sx2=0,i=0,k=0,fsx1=0.0,fsx2=0.0;
            var a=0,b=0,dxn=0,alpha=0,beta=0,beta1=0;

            var buf_node = jsfeat.cache.get_buffer((nw*ch)<<2);
            var sum_node = jsfeat.cache.get_buffer((nw*ch)<<2);

            var buf = buf_node.i32;
            var sum = sum_node.i32;

            for (; dx < nw; dx++) {
                fsx1 = dx * scale_x, fsx2 = fsx1 + scale_x;
                sx1 = (fsx1 + 1.0 - 1e-6)|0, sx2 = fsx2|0;
                sx1 = Math.min(sx1, w - 1);
                sx2 = Math.min(sx2, w - 1);

                if(sx1 > fsx1) {
                    xofs[xofs_count++] = {"si": ((sx1 - 1)*ch)|0, 
                                          "di": (dx * ch)|0, 
                                          "alpha": ((sx1 - fsx1) * 0x100)|0};
                }
                for(sx = sx1; sx < sx2; sx++){
                    xofs[xofs_count++] = {"si": (sx * ch)|0, 
                                          "di": (dx * ch)|0, 
                                          "alpha": 256};
                }
                if(fsx2 - sx2 > 1e-3) {
                    xofs[xofs_count++] = {"si": (sx2 * ch)|0, 
                                          "di": (dx * ch)|0, 
                                          "alpha": ((fsx2 - sx2) * 256)|0};
                }
            }

            for (dx = 0; dx < nw * ch; dx++) {
                buf[dx] = sum[dx] = 0;
            }
            dy = 0;
            for (sy = 0; sy < h; sy++) {
                a = w * sy;
                for (k = 0; k < xofs_count; k++) {
                    dxn = xofs[k].di;
                    alpha = xofs[k].alpha;
                    sx1 = xofs[k].si;
                    for (i = 0; i < ch; i++) {
                        buf[dxn + i] += src_d[a+sx1+i] * alpha;
                    }
                }
                if ((dy + 1) * scale_y <= sy + 1 || sy == h - 1) {
                    beta = (Math.max(sy + 1 - (dy + 1) * scale_y, 0.0) * 256)|0;
                    beta1 = 256 - beta;
                    b = nw * dy;
                    if (beta <= 0) {
                        for (dx = 0; dx < nw * ch; dx++) {
                            dst_d[b+dx] = Math.min(Math.max((sum[dx] + buf[dx] * 256) / inv_scale_256, 0), 255);
                            sum[dx] = buf[dx] = 0;
                        }
                    } else {
                        for (dx = 0; dx < nw * ch; dx++) {
                            dst_d[b+dx] = Math.min(Math.max((sum[dx] + buf[dx] * beta1) / inv_scale_256, 0), 255);
                            sum[dx] = buf[dx] * beta;
                            buf[dx] = 0;
                        }
                    }
                    dy++;
                } else {
                    for(dx = 0; dx < nw * ch; dx++) {
                        sum[dx] += buf[dx] * 256;
                        buf[dx] = 0;
                    }
                }
            }

            jsfeat.cache.put_buffer(sum_node);
            jsfeat.cache.put_buffer(buf_node);
        }

        var _resample = function(src, dst, nw, nh) {
            var xofs = [],xofs_count=0;
            var ch=src.channel,w=src.cols,h=src.rows;
            var src_d=src.data,dst_d=dst.data;
            var scale_x = w / nw, scale_y = h / nh;
            var scale = 1.0 / (scale_x * scale_y);
            var dx=0,dy=0,sx=0,sy=0,sx1=0,sx2=0,i=0,k=0,fsx1=0.0,fsx2=0.0;
            var a=0,b=0,dxn=0,alpha=0.0,beta=0.0,beta1=0.0;

            var buf_node = jsfeat.cache.get_buffer((nw*ch)<<2);
            var sum_node = jsfeat.cache.get_buffer((nw*ch)<<2);

            var buf = buf_node.f32;
            var sum = sum_node.f32;

            for (; dx < nw; dx++) {
                fsx1 = dx * scale_x, fsx2 = fsx1 + scale_x;
                sx1 = (fsx1 + 1.0 - 1e-6)|0, sx2 = fsx2|0;
                sx1 = Math.min(sx1, w - 1);
                sx2 = Math.min(sx2, w - 1);

                if(sx1 > fsx1) {
                    xofs[xofs_count++] = {"si": ((sx1 - 1)*ch)|0, 
                                          "di": (dx * ch)|0, 
                                          "alpha": (sx1 - fsx1) * scale};
                }
                for(sx = sx1; sx < sx2; sx++){
                    xofs[xofs_count++] = {"si": (sx * ch)|0, 
                                          "di": (dx * ch)|0, 
                                          "alpha": scale};
                }
                if(fsx2 - sx2 > 1e-3) {
                    xofs[xofs_count++] = {"si": (sx2 * ch)|0, 
                                          "di": (dx * ch)|0, 
                                          "alpha": (fsx2 - sx2) * scale};
                }
            }

            for (dx = 0; dx < nw * ch; dx++) {
                buf[dx] = sum[dx] = 0;
            }
            dy = 0;
            for (sy = 0; sy < h; sy++) {
                a = w * sy;
                for (k = 0; k < xofs_count; k++) {
                    dxn = xofs[k].di;
                    alpha = xofs[k].alpha;
                    sx1 = xofs[k].si;
                    for (i = 0; i < ch; i++) {
                        buf[dxn + i] += src_d[a+sx1+i] * alpha;
                    }
                }
                if ((dy + 1) * scale_y <= sy + 1 || sy == h - 1) {
                    beta = Math.max(sy + 1 - (dy + 1) * scale_y, 0.0);
                    beta1 = 1.0 - beta;
                    b = nw * dy;
                    if (Math.abs(beta) < 1e-3) {
                        for (dx = 0; dx < nw * ch; dx++) {
                            dst_d[b+dx] = sum[dx] + buf[dx];
                            sum[dx] = buf[dx] = 0;
                        }
                    } else {
                        for (dx = 0; dx < nw * ch; dx++) {
                            dst_d[b+dx] = sum[dx] + buf[dx] * beta1;
                            sum[dx] = buf[dx] * beta;
                            buf[dx] = 0;
                        }
                    }
                    dy++;
                } else {
                    for(dx = 0; dx < nw * ch; dx++) {
                        sum[dx] += buf[dx]; 
                        buf[dx] = 0;
                    }
                }
            }
            jsfeat.cache.put_buffer(sum_node);
            jsfeat.cache.put_buffer(buf_node);
        }

        var _convol_u8 = function(buf, src_d, dst_d, w, h, filter, kernel_size, half_kernel) {
            var i=0,j=0,k=0,sp=0,dp=0,sum=0,sum1=0,sum2=0,sum3=0,f0=filter[0],fk=0;
            var w2=w<<1,w3=w*3,w4=w<<2;
            // hor pass
            for (; i < h; ++i) { 
                sum = src_d[sp];
                for (j = 0; j < half_kernel; ++j) {
                    buf[j] = sum;
                }
                for (j = 0; j <= w-2; j+=2) {
                    buf[j + half_kernel] = src_d[sp+j];
                    buf[j + half_kernel+1] = src_d[sp+j+1];
                }
                for (; j < w; ++j) {
                    buf[j + half_kernel] = src_d[sp+j];
                }
                sum = src_d[sp+w-1];
                for (j = w; j < half_kernel + w; ++j) {
                    buf[j + half_kernel] = sum;
                }
                for (j = 0; j <= w-4; j+=4) {
                    sum = buf[j] * f0, 
                    sum1 = buf[j+1] * f0,
                    sum2 = buf[j+2] * f0,
                    sum3 = buf[j+3] * f0;
                    for (k = 1; k < kernel_size; ++k) {
                        fk = filter[k];
                        sum += buf[k + j] * fk;
                        sum1 += buf[k + j+1] * fk;
                        sum2 += buf[k + j+2] * fk;
                        sum3 += buf[k + j+3] * fk;
                    }
                    dst_d[dp+j] = sum >> 8;
                    dst_d[dp+j+1] = sum1 >> 8;
                    dst_d[dp+j+2] = sum2 >> 8;
                    dst_d[dp+j+3] = sum3 >> 8;
                }
                for (; j < w; ++j) {
                    sum = buf[j] * f0;
                    for (k = 1; k < kernel_size; ++k) {
                        sum += buf[k + j] * filter[k];
                    }
                    dst_d[dp+j] = sum >> 8;
                }
                sp += w;
                dp += w;
            }

            // vert pass
            for (i = 0; i < w; ++i) {
                sum = dst_d[i];
                for (j = 0; j < half_kernel; ++j) {
                    buf[j] = sum;
                }
                k = i;
                for (j = 0; j <= h-2; j+=2, k+=w2) {
                    buf[j+half_kernel] = dst_d[k];
                    buf[j+half_kernel+1] = dst_d[k+w];
                }
                for (; j < h; ++j, k+=w) {
                    buf[j+half_kernel] = dst_d[k];
                }
                sum = dst_d[(h-1)*w + i];
                for (j = h; j < half_kernel + h; ++j) {
                    buf[j + half_kernel] = sum;
                }
                dp = i;
                for (j = 0; j <= h-4; j+=4, dp+=w4) { 
                    sum = buf[j] * f0, 
                    sum1 = buf[j+1] * f0,
                    sum2 = buf[j+2] * f0,
                    sum3 = buf[j+3] * f0;
                    for (k = 1; k < kernel_size; ++k) {
                        fk = filter[k];
                        sum += buf[k + j] * fk;
                        sum1 += buf[k + j+1] * fk;
                        sum2 += buf[k + j+2] * fk;
                        sum3 += buf[k + j+3] * fk;
                    }
                    dst_d[dp] = sum >> 8;
                    dst_d[dp+w] = sum1 >> 8;
                    dst_d[dp+w2] = sum2 >> 8;
                    dst_d[dp+w3] = sum3 >> 8;
                }
                for (; j < h; ++j, dp+=w) {
                    sum = buf[j] * f0;
                    for (k = 1; k < kernel_size; ++k) {
                        sum += buf[k + j] * filter[k];
                    }
                    dst_d[dp] = sum >> 8;
                }
            }
        }

        var _convol = function(buf, src_d, dst_d, w, h, filter, kernel_size, half_kernel) {
            var i=0,j=0,k=0,sp=0,dp=0,sum=0.0,sum1=0.0,sum2=0.0,sum3=0.0,f0=filter[0],fk=0.0;
            var w2=w<<1,w3=w*3,w4=w<<2;
            // hor pass
            for (; i < h; ++i) { 
                sum = src_d[sp];
                for (j = 0; j < half_kernel; ++j) {
                    buf[j] = sum;
                }
                for (j = 0; j <= w-2; j+=2) {
                    buf[j + half_kernel] = src_d[sp+j];
                    buf[j + half_kernel+1] = src_d[sp+j+1];
                }
                for (; j < w; ++j) {
                    buf[j + half_kernel] = src_d[sp+j];
                }
                sum = src_d[sp+w-1];
                for (j = w; j < half_kernel + w; ++j) {
                    buf[j + half_kernel] = sum;
                }
                for (j = 0; j <= w-4; j+=4) {
                    sum = buf[j] * f0, 
                    sum1 = buf[j+1] * f0,
                    sum2 = buf[j+2] * f0,
                    sum3 = buf[j+3] * f0;
                    for (k = 1; k < kernel_size; ++k) {
                        fk = filter[k];
                        sum += buf[k + j] * fk;
                        sum1 += buf[k + j+1] * fk;
                        sum2 += buf[k + j+2] * fk;
                        sum3 += buf[k + j+3] * fk;
                    }
                    dst_d[dp+j] = sum;
                    dst_d[dp+j+1] = sum1;
                    dst_d[dp+j+2] = sum2;
                    dst_d[dp+j+3] = sum3;
                }
                for (; j < w; ++j) {
                    sum = buf[j] * f0;
                    for (k = 1; k < kernel_size; ++k) {
                        sum += buf[k + j] * filter[k];
                    }
                    dst_d[dp+j] = sum;
                }
                sp += w;
                dp += w;
            }

            // vert pass
            for (i = 0; i < w; ++i) {
                sum = dst_d[i];
                for (j = 0; j < half_kernel; ++j) {
                    buf[j] = sum;
                }
                k = i;
                for (j = 0; j <= h-2; j+=2, k+=w2) {
                    buf[j+half_kernel] = dst_d[k];
                    buf[j+half_kernel+1] = dst_d[k+w];
                }
                for (; j < h; ++j, k+=w) {
                    buf[j+half_kernel] = dst_d[k];
                }
                sum = dst_d[(h-1)*w + i];
                for (j = h; j < half_kernel + h; ++j) {
                    buf[j + half_kernel] = sum;
                }
                dp = i;
                for (j = 0; j <= h-4; j+=4, dp+=w4) { 
                    sum = buf[j] * f0, 
                    sum1 = buf[j+1] * f0,
                    sum2 = buf[j+2] * f0,
                    sum3 = buf[j+3] * f0;
                    for (k = 1; k < kernel_size; ++k) {
                        fk = filter[k];
                        sum += buf[k + j] * fk;
                        sum1 += buf[k + j+1] * fk;
                        sum2 += buf[k + j+2] * fk;
                        sum3 += buf[k + j+3] * fk;
                    }
                    dst_d[dp] = sum;
                    dst_d[dp+w] = sum1;
                    dst_d[dp+w2] = sum2;
                    dst_d[dp+w3] = sum3;
                }
                for (; j < h; ++j, dp+=w) {
                    sum = buf[j] * f0;
                    for (k = 1; k < kernel_size; ++k) {
                        sum += buf[k + j] * filter[k];
                    }
                    dst_d[dp] = sum;
                }
            }
        }

        return {
            // TODO: add support for RGB/BGR order
            // for raw arrays
            grayscale: function(src, dst) {
                var srcLength = src.length|0, srcLength_16 = (srcLength - 16)|0;
                var j = 0;
                var coeff_r = 4899, coeff_g = 9617, coeff_b = 1868;

                for (var i = 0; i <= srcLength_16; i += 16, j += 4) {
                    dst[j]     = (src[i] * coeff_r + src[i+1] * coeff_g + src[i+2] * coeff_b + 8192) >> 14;
                    dst[j + 1] = (src[i+4] * coeff_r + src[i+5] * coeff_g + src[i+6] * coeff_b + 8192) >> 14;
                    dst[j + 2] = (src[i+8] * coeff_r + src[i+9] * coeff_g + src[i+10] * coeff_b + 8192) >> 14;
                    dst[j + 3] = (src[i+12] * coeff_r + src[i+13] * coeff_g + src[i+14] * coeff_b + 8192) >> 14;
                }
                for (; i < srcLength; i += 4, ++j) {
                    dst[j] = (src[i] * coeff_r + src[i+1] * coeff_g + src[i+2] * coeff_b + 8192) >> 14;
                }
            },
            // derived from CCV library
            resample: function(src, dst, nw, nh) {
                var h=src.rows,w=src.cols;
                if (h > nh && w > nw) {
                    // using the fast alternative (fix point scale, 0x100 to avoid overflow)
                    if (src.type&jsfeat.U8_t && dst.type&jsfeat.U8_t && h * w / (nh * nw) < 0x100) {
                        _resample_u8(src, dst, nw, nh);
                    } else {
                        _resample(src, dst, nw, nh);
                    }
                }
            },

            box_blur_gray: function(src, dst, radius, options) {
                if (typeof options === "undefined") { options = 0; }
                var w=src.cols, h=src.rows;
                var i,x,y;
                var windowSize = radius * 2 + 1;
                var radiusPlusOne = radius + 1;
                var offset = 8192;
                var scale = options&jsfeat.BOX_BLUR_NOSCALE ? 1 : (16384 * (1.0/(windowSize*windowSize)))|0;

                var tmp_buff = jsfeat.cache.get_buffer((w*h)<<2);

                var sum, dstIndex, srcIndex = 0, nextPixelIndex, previousPixelIndex;
                var tmp = tmp_buff.i32; // to prevent overflow
                var input, output;
                var hold;

                // first pass
                // no need to scale 
                input = src.data;
                output = tmp;
                for (y = 0; y < h; ++y) {
                    dstIndex = y;
                    sum = radiusPlusOne * input[srcIndex];

                    for(i = 1; i <= radius; ++i) {
                        sum += input[srcIndex + i];
                    }

                    nextPixelIndex = srcIndex + radiusPlusOne;
                    previousPixelIndex = srcIndex;
                    hold = input[previousPixelIndex];
                    for(x = 0; x < radius; ++x, dstIndex += h) {
                        output[dstIndex] = sum;
                        sum += input[nextPixelIndex]- hold;
                        nextPixelIndex ++;
                    }
                    for(; x <= w-radiusPlusOne-2; x+=2, dstIndex += h<<1) {
                        output[dstIndex] = sum;
                        sum += input[nextPixelIndex]- input[previousPixelIndex];

                        output[dstIndex+h] = sum;
                        sum += input[nextPixelIndex+1]- input[previousPixelIndex+1];

                        nextPixelIndex +=2;
                        previousPixelIndex +=2;
                    }
                    for(; x < w-radiusPlusOne; ++x, dstIndex += h) {
                        output[dstIndex] = sum;
                        sum += input[nextPixelIndex]- input[previousPixelIndex];

                        nextPixelIndex ++;
                        previousPixelIndex ++;
                    }
                    
                    hold = input[nextPixelIndex-1];
                    for(; x < w; ++x, dstIndex += h) {
                        output[dstIndex] = sum;

                        sum += hold- input[previousPixelIndex];
                        previousPixelIndex ++;
                    }

                    srcIndex += w;
                }
                //
                // second pass
                srcIndex = 0;
                input = tmp; // this is a transpose
                output = dst.data;
                for (y = 0; y < w; ++y) {
                    dstIndex = y;
                    sum = radiusPlusOne * input[srcIndex];

                    for(i = 1; i <= radius; ++i) {
                        sum += input[srcIndex + i];
                    }

                    nextPixelIndex = srcIndex + radiusPlusOne;
                    previousPixelIndex = srcIndex;
                    hold = input[previousPixelIndex];

                    // dont scale result
                    if(scale == 1) {
                        for(x = 0; x < radius; ++x, dstIndex += w) {
                            output[dstIndex] = sum;
                            sum += input[nextPixelIndex]- hold;
                            nextPixelIndex ++;
                        }
                        for(; x <= h-radiusPlusOne-2; x+=2, dstIndex += w<<1) {
                            output[dstIndex] = sum;
                            sum += input[nextPixelIndex]- input[previousPixelIndex];

                            output[dstIndex+w] = sum;
                            sum += input[nextPixelIndex+1]- input[previousPixelIndex+1];

                            nextPixelIndex +=2;
                            previousPixelIndex +=2;
                        }
                        for(; x < h-radiusPlusOne; ++x, dstIndex += w) {
                            output[dstIndex] = sum;

                            sum += input[nextPixelIndex]- input[previousPixelIndex];
                            nextPixelIndex ++;
                            previousPixelIndex ++;
                        }
                        hold = input[nextPixelIndex-1];
                        for(; x < h; ++x, dstIndex += w) {
                            output[dstIndex] = sum;

                            sum += hold- input[previousPixelIndex];
                            previousPixelIndex ++;
                        }
                    } else {
                        for(x = 0; x < radius; ++x, dstIndex += w) {
                            output[dstIndex] = (sum*scale+offset)>>14;
                            sum += input[nextPixelIndex]- hold;
                            nextPixelIndex ++;
                        }
                        for(; x <= h-radiusPlusOne-2; x+=2, dstIndex += w<<1) {
                            output[dstIndex] = (sum*scale+offset)>>14;
                            sum += input[nextPixelIndex]- input[previousPixelIndex];

                            output[dstIndex+w] = (sum*scale+offset)>>14;
                            sum += input[nextPixelIndex+1]- input[previousPixelIndex+1];

                            nextPixelIndex +=2;
                            previousPixelIndex +=2;
                        }
                        for(; x < h-radiusPlusOne; ++x, dstIndex += w) {
                            output[dstIndex] = (sum*scale+offset)>>14;

                            sum += input[nextPixelIndex]- input[previousPixelIndex];
                            nextPixelIndex ++;
                            previousPixelIndex ++;
                        }
                        hold = input[nextPixelIndex-1];
                        for(; x < h; ++x, dstIndex += w) {
                            output[dstIndex] = (sum*scale+offset)>>14;

                            sum += hold- input[previousPixelIndex];
                            previousPixelIndex ++;
                        }
                    }

                    srcIndex += h;
                }

                jsfeat.cache.put_buffer(tmp_buff);
            },

            gaussian_blur: function(src, dst, kernel_size, sigma) {
                if (typeof sigma === "undefined") { sigma = 0.0; }
                if (typeof kernel_size === "undefined") { kernel_size = 0; }
                kernel_size = kernel_size == 0 ? (Math.max(1, (4.0 * sigma + 1.0 - 1e-8)) * 2 + 1)|0 : kernel_size;
                var half_kernel = kernel_size >> 1;
                var w = src.cols, h = src.rows;
                var data_type = src.type, is_u8 = data_type&jsfeat.U8_t;
                var src_d = src.data, dst_d = dst.data;
                var buf,filter,buf_sz=(kernel_size + Math.max(h, w))|0;

                var buf_node = jsfeat.cache.get_buffer(buf_sz<<2);
                var filt_node = jsfeat.cache.get_buffer(kernel_size<<2);

                if(is_u8) {
                    buf = buf_node.u8;
                    filter = filt_node.i32;
                } else if(data_type&jsfeat.S32_t) {
                    buf = buf_node.i32;
                    filter = filt_node.f32;
                } else {
                    buf = buf_node.f32;
                    filter = filt_node.f32;
                }

                jsfeat.math.get_gaussian_kernel(kernel_size, sigma, filter, data_type);

                if(is_u8) {
                    _convol_u8(buf, src_d, dst_d, w, h, filter, kernel_size, half_kernel);
                } else {
                    _convol(buf, src_d, dst_d, w, h, filter, kernel_size, half_kernel);
                }

                jsfeat.cache.put_buffer(buf_node);
                jsfeat.cache.put_buffer(filt_node);
            },
            // assume we always need it for u8 image
            pyrdown: function(src, dst) {
                var w = src.cols, h = src.rows;
                var w2 = w >> 1, h2 = h >> 1;
                var x=0,y=0,sptr=0,sline=0,dptr=0;
                var src_d = src.data, dst_d = dst.data;

                for(y = 0; y < h2; ++y) {
                    sline = sptr;
                    for(x = 0; x <= w2-2; x+=2, dptr+=2, sline += 4) {
                        dst_d[dptr] = (src_d[sline] + src_d[sline+1] +
                                            src_d[sline+w] + src_d[sline+w+1] + 2) >> 2;
                        dst_d[dptr+1] = (src_d[sline+2] + src_d[sline+3] +
                                            src_d[sline+w+2] + src_d[sline+w+3] + 2) >> 2;
                    }
                    for(; x < w2; ++x, ++dptr, sline += 2) {
                        dst_d[dptr] = (src_d[sline] + src_d[sline+1] +
                                            src_d[sline+w] + src_d[sline+w+1] + 2) >> 2;
                    }
                    sptr += w << 1;
                }
            },

            // dst: [gx,gy,...]
            scharr_derivatives: function(src, dst) {
                var w = src.cols, h = src.rows;
                var dstep = w<<1,x=0,y=0,x1=0,a,b,c,d,e,f;
                var srow0=0,srow1=0,srow2=0,drow=0;
                var trow0,trow1;
                var img = src.data;

                var buf0_node = jsfeat.cache.get_buffer((w+2)<<2);
                var buf1_node = jsfeat.cache.get_buffer((w+2)<<2);

                if(src.type&jsfeat.U8_t || src.type&jsfeat.S32_t) {
                    trow0 = buf0_node.i32;
                    trow1 = buf1_node.i32;
                } else {
                    trow0 = buf0_node.f32;
                    trow1 = buf1_node.f32;
                }

                for(; y < h; ++y, srow1+=w) {
                    srow0 = ((y > 0 ? y-1 : 1)*w)|0;
                    srow2 = ((y < h-1 ? y+1 : h-2)*w)|0;
                    drow = (y*dstep)|0;
                    // do vertical convolution
                    for(x = 0, x1 = 1; x <= w-2; x+=2, x1+=2) {
                        a = img[srow0+x], b = img[srow2+x];
                        trow0[x1] = ( (a + b)*3 + (img[srow1+x])*10 );
                        trow1[x1] = ( b - a );
                        //
                        a = img[srow0+x+1], b = img[srow2+x+1];
                        trow0[x1+1] = ( (a + b)*3 + (img[srow1+x+1])*10 );
                        trow1[x1+1] = ( b - a );
                    }
                    for(; x < w; ++x, ++x1) {
                        a = img[srow0+x], b = img[srow2+x];
                        trow0[x1] = ( (a + b)*3 + (img[srow1+x])*10 );
                        trow1[x1] = ( b - a );
                    }
                    // make border
                    x = (w + 1)|0;
                    trow0[0] = trow0[1]; trow0[x] = trow0[w];
                    trow1[0] = trow1[1]; trow1[x] = trow1[w];
                    // do horizontal convolution, interleave the results and store them
                    for(x = 0; x <= w-4; x+=4) {
                        a = trow1[x+2], b = trow1[x+1], c = trow1[x+3], d = trow1[x+4],
                        e = trow0[x+2], f = trow0[x+3];
                        dst[drow++] = ( e - trow0[x] );
                        dst[drow++] = ( (a + trow1[x])*3 + b*10 );
                        dst[drow++] = ( f - trow0[x+1] );
                        dst[drow++] = ( (c + b)*3 + a*10 );

                        dst[drow++] = ( (trow0[x+4] - e) );
                        dst[drow++] = ( ((d + a)*3 + c*10) );
                        dst[drow++] = ( (trow0[x+5] - f) );
                        dst[drow++] = ( ((trow1[x+5] + c)*3 + d*10) );
                    }
                    for(; x < w; ++x) {
                        dst[drow++] = ( (trow0[x+2] - trow0[x]) );
                        dst[drow++] = ( ((trow1[x+2] + trow1[x])*3 + trow1[x+1]*10) );
                    }
                }
                jsfeat.cache.put_buffer(buf0_node);
                jsfeat.cache.put_buffer(buf1_node);
            },

            // compute gradient using Sobel kernel [1 2 1] * [-1 0 1]^T
            // dst: [gx,gy,...]
            sobel_derivatives: function(src, dst) {
                var w = src.cols, h = src.rows;
                var dstep = w<<1,x=0,y=0,x1=0,a,b,c,d,e,f;
                var srow0=0,srow1=0,srow2=0,drow=0;
                var trow0,trow1;
                var img = src.data;

                var buf0_node = jsfeat.cache.get_buffer((w+2)<<2);
                var buf1_node = jsfeat.cache.get_buffer((w+2)<<2);

                if(src.type&jsfeat.U8_t || src.type&jsfeat.S32_t) {
                    trow0 = buf0_node.i32;
                    trow1 = buf1_node.i32;
                } else {
                    trow0 = buf0_node.f32;
                    trow1 = buf1_node.f32;
                }

                for(; y < h; ++y, srow1+=w) {
                    srow0 = ((y > 0 ? y-1 : 1)*w)|0;
                    srow2 = ((y < h-1 ? y+1 : h-2)*w)|0;
                    drow = (y*dstep)|0;
                    // do vertical convolution
                    for(x = 0, x1 = 1; x <= w-2; x+=2, x1+=2) {
                        a = img[srow0+x], b = img[srow2+x];
                        trow0[x1] = ( (a + b) + (img[srow1+x]*2) );
                        trow1[x1] = ( b - a );
                        //
                        a = img[srow0+x+1], b = img[srow2+x+1];
                        trow0[x1+1] = ( (a + b) + (img[srow1+x+1]*2) );
                        trow1[x1+1] = ( b - a );
                    }
                    for(; x < w; ++x, ++x1) {
                        a = img[srow0+x], b = img[srow2+x];
                        trow0[x1] = ( (a + b) + (img[srow1+x]*2) );
                        trow1[x1] = ( b - a );
                    }
                    // make border
                    x = (w + 1)|0;
                    trow0[0] = trow0[1]; trow0[x] = trow0[w];
                    trow1[0] = trow1[1]; trow1[x] = trow1[w];
                    // do horizontal convolution, interleave the results and store them
                    for(x = 0; x <= w-4; x+=4) {
                        a = trow1[x+2], b = trow1[x+1], c = trow1[x+3], d = trow1[x+4],
                        e = trow0[x+2], f = trow0[x+3];
                        dst[drow++] = ( e - trow0[x] );
                        dst[drow++] = ( a + trow1[x] + b*2 );
                        dst[drow++] = ( f - trow0[x+1] );
                        dst[drow++] = ( c + b + a*2 );

                        dst[drow++] = ( trow0[x+4] - e );
                        dst[drow++] = ( d + a + c*2 );
                        dst[drow++] = ( trow0[x+5] - f );
                        dst[drow++] = ( trow1[x+5] + c + d*2 );
                    }
                    for(; x < w; ++x) {
                        dst[drow++] = ( trow0[x+2] - trow0[x] );
                        dst[drow++] = ( trow1[x+2] + trow1[x] + trow1[x+1]*2 );
                    }
                }
                jsfeat.cache.put_buffer(buf0_node);
                jsfeat.cache.put_buffer(buf1_node);
            },

            // please note: 
            // dst_(type) size should be cols = src.cols+1, rows = src.rows+1
            compute_integral_image: function(src, dst_sum, dst_sqsum, dst_tilted) {
                var w0=src.cols,h0=src.rows,src_d=src.data;
                var w1=w0+1;
                var s,s2,p,pup,i=0,j=0,v,k;

                if(dst_sum && dst_sqsum) {
                    // fill first row with zeros
                    for(; i < w1; ++i) {
                        dst_sum[i] = 0, dst_sqsum[i] = 0;
                    }
                    p = (w1+1)|0, pup = 1;
                    for(i = 0, k = 0; i < h0; ++i, ++p, ++pup) {
                        s = s2 = 0;
                        for(j = 0; j <= w0-2; j+=2, k+=2, p+=2, pup+=2) {
                            v = src_d[k];
                            s += v, s2 += v*v;
                            dst_sum[p] = dst_sum[pup] + s;
                            dst_sqsum[p] = dst_sqsum[pup] + s2;

                            v = src_d[k+1];
                            s += v, s2 += v*v;
                            dst_sum[p+1] = dst_sum[pup+1] + s;
                            dst_sqsum[p+1] = dst_sqsum[pup+1] + s2;
                        }
                        for(; j < w0; ++j, ++k, ++p, ++pup) {
                            v = src_d[k];
                            s += v, s2 += v*v;
                            dst_sum[p] = dst_sum[pup] + s;
                            dst_sqsum[p] = dst_sqsum[pup] + s2;
                        }
                    }
                } else if(dst_sum) {
                    // fill first row with zeros
                    for(; i < w1; ++i) {
                        dst_sum[i] = 0;
                    }
                    p = (w1+1)|0, pup = 1;
                    for(i = 0, k = 0; i < h0; ++i, ++p, ++pup) {
                        s = 0;
                        for(j = 0; j <= w0-2; j+=2, k+=2, p+=2, pup+=2) {
                            s += src_d[k];
                            dst_sum[p] = dst_sum[pup] + s;
                            s += src_d[k+1];
                            dst_sum[p+1] = dst_sum[pup+1] + s;
                        }
                        for(; j < w0; ++j, ++k, ++p, ++pup) {
                            s += src_d[k];
                            dst_sum[p] = dst_sum[pup] + s;
                        }
                    }
                } else if(dst_sqsum) {
                    // fill first row with zeros
                    for(; i < w1; ++i) {
                        dst_sqsum[i] = 0;
                    }
                    p = (w1+1)|0, pup = 1;
                    for(i = 0, k = 0; i < h0; ++i, ++p, ++pup) {
                        s2 = 0;
                        for(j = 0; j <= w0-2; j+=2, k+=2, p+=2, pup+=2) {
                            v = src_d[k];
                            s2 += v*v;
                            dst_sqsum[p] = dst_sqsum[pup] + s2;
                            v = src_d[k+1];
                            s2 += v*v;
                            dst_sqsum[p+1] = dst_sqsum[pup+1] + s2;
                        }
                        for(; j < w0; ++j, ++k, ++p, ++pup) {
                            v = src_d[k];
                            s2 += v*v;
                            dst_sqsum[p] = dst_sqsum[pup] + s2;
                        }
                    }
                }

                if(dst_tilted) {
                    // fill first row with zeros
                    for(i = 0; i < w1; ++i) {
                        dst_tilted[i] = 0;
                    }
                    // diagonal
                    p = (w1+1)|0, pup = 0;
                    for(i = 0, k = 0; i < h0; ++i, ++p, ++pup) {
                        for(j = 0; j <= w0-2; j+=2, k+=2, p+=2, pup+=2) {
                            dst_tilted[p] = src_d[k] + dst_tilted[pup];
                            dst_tilted[p+1] = src_d[k+1] + dst_tilted[pup+1];
                        }
                        for(; j < w0; ++j, ++k, ++p, ++pup) {
                            dst_tilted[p] = src_d[k] + dst_tilted[pup];
                        }
                    }
                    // diagonal
                    p = (w1+w0)|0, pup = w0;
                    for(i = 0; i < h0; ++i, p+=w1, pup+=w1) {
                        dst_tilted[p] += dst_tilted[pup];
                    }

                    for(j = w0-1; j > 0; --j) {
                        p = j+h0*w1, pup=p-w1;
                        for(i = h0; i > 0; --i, p-=w1, pup-=w1) {
                            dst_tilted[p] += dst_tilted[pup] + dst_tilted[pup+1];
                        }
                    }
                }
            },
            equalize_histogram: function(src, dst) {
                var w=src.cols,h=src.rows,src_d=src.data,dst_d=dst.data,size=w*h;
                var i=0,prev=0,hist0,norm;

                var hist0_node = jsfeat.cache.get_buffer(256<<2);
                hist0 = hist0_node.i32;
                for(; i < 256; ++i) hist0[i] = 0;
                for (i = 0; i < size; ++i) {
                    ++hist0[src_d[i]];
                }

                prev = hist0[0];
                for (i = 1; i < 256; ++i) {
                    prev = hist0[i] += prev;
                }

                norm = 255 / size;
                for (i = 0; i < size; ++i) {
                    dst_d[i] = (hist0[src_d[i]] * norm + 0.5)|0;
                }
                jsfeat.cache.put_buffer(hist0_node);
            },

            canny: function(src, dst, low_thresh, high_thresh) {
                var w=src.cols,h=src.rows,src_d=src.data,dst_d=dst.data;
                var i=0,j=0,grad=0,w2=w<<1,_grad=0,suppress=0,f=0,x=0,y=0,s=0;
                var tg22x=0,tg67x=0;

                // cache buffers
                var dxdy_node = jsfeat.cache.get_buffer((h * w2)<<2);
                var buf_node = jsfeat.cache.get_buffer((3 * (w + 2))<<2);
                var map_node = jsfeat.cache.get_buffer(((h+2) * (w + 2))<<2);
                var stack_node = jsfeat.cache.get_buffer((h * w)<<2);
                

                var buf = buf_node.i32;
                var map = map_node.i32;
                var stack = stack_node.i32;
                var dxdy = dxdy_node.i32;
                var row0=1,row1=(w+2+1)|0,row2=(2*(w+2)+1)|0,map_w=(w+2)|0,map_i=(map_w+1)|0,stack_i=0;

                this.sobel_derivatives(src, dxdy);

                if(low_thresh > high_thresh) {
                    i = low_thresh;
                    low_thresh = high_thresh;
                    high_thresh = i;
                }

                i = (3 * (w + 2))|0;
                while(--i>=0) {
                    buf[i] = 0;
                }

                i = ((h+2) * (w + 2))|0;
                while(--i>=0) {
                    map[i] = 0;
                }

                for (; j < w; ++j, grad+=2) {
                    //buf[row1+j] = Math.abs(dxdy[grad]) + Math.abs(dxdy[grad+1]);
                    x = dxdy[grad], y = dxdy[grad+1];
                    //buf[row1+j] = x*x + y*y;
                    buf[row1+j] = ((x ^ (x >> 31)) - (x >> 31)) + ((y ^ (y >> 31)) - (y >> 31));
                }

                for(i=1; i <= h; ++i, grad+=w2) {
                    if(i == h) {
                        j = row2+w;
                        while(--j>=row2) {
                            buf[j] = 0;
                        }
                    } else {
                        for (j = 0; j < w; j++) {
                            //buf[row2+j] =  Math.abs(dxdy[grad+(j<<1)]) + Math.abs(dxdy[grad+(j<<1)+1]);
                            x = dxdy[grad+(j<<1)], y = dxdy[grad+(j<<1)+1];
                            //buf[row2+j] = x*x + y*y;
                            buf[row2+j] = ((x ^ (x >> 31)) - (x >> 31)) + ((y ^ (y >> 31)) - (y >> 31));
                        }
                    }
                    _grad = (grad - w2)|0;
                    map[map_i-1] = 0;
                    suppress = 0;
                    for(j = 0; j < w; ++j, _grad+=2) {
                        f = buf[row1+j];
                        if (f > low_thresh) {
                            x = dxdy[_grad];
                            y = dxdy[_grad+1];
                            s = x ^ y;
                            // seems ot be faster than Math.abs
                            x = ((x ^ (x >> 31)) - (x >> 31))|0;
                            y = ((y ^ (y >> 31)) - (y >> 31))|0;
                            //x * tan(22.5) x * tan(67.5) == 2 * x + x * tan(22.5)
                            tg22x = x * 13573;
                            tg67x = tg22x + ((x + x) << 15);
                            y <<= 15;
                            if (y < tg22x) {
                                if (f > buf[row1+j-1] && f >= buf[row1+j+1]) {
                                    if (f > high_thresh && !suppress && map[map_i+j-map_w] != 2) {
                                        map[map_i+j] = 2;
                                        suppress = 1;
                                        stack[stack_i++] = map_i + j;
                                    } else {
                                        map[map_i+j] = 1;
                                    }
                                    continue;
                                }
                            } else if (y > tg67x) {
                                if (f > buf[row0+j] && f >= buf[row2+j]) {
                                    if (f > high_thresh && !suppress && map[map_i+j-map_w] != 2) {
                                        map[map_i+j] = 2;
                                        suppress = 1;
                                        stack[stack_i++] = map_i + j;
                                    } else {
                                        map[map_i+j] = 1;
                                    }
                                    continue;
                                }
                            } else {
                                s = s < 0 ? -1 : 1;
                                if (f > buf[row0+j-s] && f > buf[row2+j+s]) {
                                    if (f > high_thresh && !suppress && map[map_i+j-map_w] != 2) {
                                        map[map_i+j] = 2;
                                        suppress = 1;
                                        stack[stack_i++] = map_i + j;
                                    } else {
                                        map[map_i+j] = 1;
                                    }
                                    continue;
                                }
                            }
                        }
                        map[map_i+j] = 0;
                        suppress = 0;
                    }
                    map[map_i+w] = 0;
                    map_i += map_w;
                    j = row0;
                    row0 = row1;
                    row1 = row2;
                    row2 = j;
                }

                j = map_i - map_w - 1;
                for(i = 0; i < map_w; ++i, ++j) {
                    map[j] = 0;
                }
                // path following
                while(stack_i > 0) {
                    map_i = stack[--stack_i];
                    map_i -= map_w+1;
                    if(map[map_i] == 1) map[map_i] = 2, stack[stack_i++] = map_i;
                    map_i += 1;
                    if(map[map_i] == 1) map[map_i] = 2, stack[stack_i++] = map_i;
                    map_i += 1;
                    if(map[map_i] == 1) map[map_i] = 2, stack[stack_i++] = map_i;
                    map_i += map_w;
                    if(map[map_i] == 1) map[map_i] = 2, stack[stack_i++] = map_i;
                    map_i -= 2;
                    if(map[map_i] == 1) map[map_i] = 2, stack[stack_i++] = map_i;
                    map_i += map_w;
                    if(map[map_i] == 1) map[map_i] = 2, stack[stack_i++] = map_i;
                    map_i += 1;
                    if(map[map_i] == 1) map[map_i] = 2, stack[stack_i++] = map_i;
                    map_i += 1;
                    if(map[map_i] == 1) map[map_i] = 2, stack[stack_i++] = map_i;
                }

                map_i = map_w + 1;
                row0 = 0;
                for(i = 0; i < h; ++i, map_i+=map_w) {
                    for(j = 0; j < w; ++j) {
                        dst_d[row0++] = (map[map_i+j] == 2) * 0xff;
                    }
                }

                // free buffers
                jsfeat.cache.put_buffer(dxdy_node);
                jsfeat.cache.put_buffer(buf_node);
                jsfeat.cache.put_buffer(map_node);
                jsfeat.cache.put_buffer(stack_node);
            },

            warp_perspective: function(src, dst, transform, fill_value) {
                if (typeof fill_value === "undefined") { fill_value = 0; }
                var src_width=src.cols, src_height=src.rows, dst_width=dst.cols, dst_height=dst.rows;
                var src_d=src.data, dst_d=dst.data;
                var x=0,y=0,off=0,ixs=0,iys=0,xs=0.0,ys=0.0,xs0=0.0,ys0=0.0,ws=0.0,sc=0.0,a=0.0,b=0.0,p0=0.0,p1=0.0;
                var m00=transform[0],m01=transform[1],m02=transform[2],
                    m10=transform[3],m11=transform[4],m12=transform[5],
                    m20=transform[6],m21=transform[7],m22=transform[8];

                for(var dptr = 0; y < dst_height; ++y) {
                    xs0 = m01 * y + m02,
                    ys0 = m11 * y + m12,
                    ws  = m21 * y + m22;
                    for(x = 0; x < dst_width; ++x, ++dptr, xs0+=m00, ys0+=m10, ws+=m20) {
                        sc = 1.0 / ws;
                        xs = xs0 * sc, ys = ys0 * sc;
                        ixs = xs | 0, iys = ys | 0;

                        if(xs > 0 && ys > 0 && ixs < (src_width - 1) && iys < (src_height - 1)) {
                            a = Math.max(xs - ixs, 0.0);
                            b = Math.max(ys - iys, 0.0);
                            off = src_width*iys + ixs;

                            p0 = src_d[off] +  a * (src_d[off+1] - src_d[off]);
                            p1 = src_d[off+src_width] + a * (src_d[off+src_width+1] - src_d[off+src_width]);

                            dst_d[dptr] = p0 + b * (p1 - p0);
                        }
                        else dst_d[dptr] = fill_value;
                    }
                }
            },

            warp_affine: function(src, dst, transform, fill_value) {
                if (typeof fill_value === "undefined") { fill_value = 0; }
                var src_width=src.cols, src_height=src.rows, dst_width=dst.cols, dst_height=dst.rows;
                var src_d=src.data, dst_d=dst.data;
                var x=0,y=0,off=0,ixs=0,iys=0,xs=0.0,ys=0.0,a=0.0,b=0.0,p0=0.0,p1=0.0;
                var m00=transform[0],m01=transform[1],m02=transform[2],
                    m10=transform[3],m11=transform[4],m12=transform[5];

                for(var dptr = 0; y < dst_height; ++y) {
                    xs = m01 * y + m02;
                    ys = m11 * y + m12;
                    for(x = 0; x < dst_width; ++x, ++dptr, xs+=m00, ys+=m10) {
                        ixs = xs | 0; iys = ys | 0;

                        if(xs > 0 && ys > 0 && ixs < (src_width - 1) && iys < (src_height - 1)) {
                            a = Math.max(xs - ixs, 0.0);
                            b = Math.max(ys - iys, 0.0);
                            off = src_width*iys + ixs;

                            p0 = src_d[off] +  a * (src_d[off+1] - src_d[off]);
                            p1 = src_d[off+src_width] + a * (src_d[off+src_width+1] - src_d[off+src_width]);

                            dst_d[dptr] = p0 + b * (p1 - p0);
                        }
                        else dst_d[dptr] = fill_value;
                    }
                }
            }
        };
    })();

    global.imgproc = imgproc;

})(jsfeat);
