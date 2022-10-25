// @filename: Convert16b32fp.ts

const conv_bit_size = function(input_unsigned_int, bits_per_sample) { // converts unsigned into signed

  //see above cut N paste of actual samples of input N output to this function

  var max = (1 << (bits_per_sample - 1)) - 1;

  return ((input_unsigned_int > max) ? input_unsigned_int - ((max << 1) + 2) : input_unsigned_int);
}

const convert_16_bit_signed_int_to_32_bit_float = function(input_8_bit_int_buffer)
{
  // input buffer is 8 bit integers which need to get shifted and OR'd into 16 bit signed integers
  //              which is then converted into 32 bit floats
  //
  // This does NOT fully utilize 32 bits since input is only 16 bit

  // assumes input range of 16 bit signed ints :  -2^15 to (2^15 - 1)  == -32768 to 32767
  // ONLY after the shift and logical OR happens from a pair of 8 bit integers

  var bits_per_sample = 16;

  var size_source_buffer = input_8_bit_int_buffer.length;

  var new_32_bit_array = new Float32Array(input_8_bit_int_buffer.length / 2);

  var max_int_value_seen = -99999999.9;
  var min_int_value_seen =  99999999.9;

  var max_float_value_seen = -99999999.9;
  var min_float_value_seen =  99999999.9;

  // var tmp_16_bit_signed_int;
  var tmp_16_bit_unsigned_int;

  var value_16_bit_signed_int;
  var index_32_bit_floats = 0;

  for (var index = 0; index < size_source_buffer; index += 2, index_32_bit_floats++) {

    // tmp_16_bit_signed_int = (input_8_bit_int_buffer[index + 1] << 8) | input_8_bit_int_buffer[index];
    tmp_16_bit_unsigned_int = (input_8_bit_int_buffer[index + 1] << 8) | input_8_bit_int_buffer[index];

    // value_16_bit_signed_int = conv_bit_size(tmp_16_bit_signed_int, bits_per_sample);
    value_16_bit_signed_int = conv_bit_size(tmp_16_bit_unsigned_int, bits_per_sample);

    // console.log("tmp_16_bit_unsigned_int ", tmp_16_bit_unsigned_int, 
    //       " value_16_bit_signed_int ", value_16_bit_signed_int);

    if (value_16_bit_signed_int < min_int_value_seen) {

      min_int_value_seen = value_16_bit_signed_int;

    } else if (value_16_bit_signed_int > max_int_value_seen) {

      max_int_value_seen = value_16_bit_signed_int;
    }

    // ---

      new_32_bit_array[index_32_bit_floats] = ((0 < value_16_bit_signed_int) ? 
                              value_16_bit_signed_int / 0x7FFF : 
                              value_16_bit_signed_int / 0x8000);
    // ---

    if (new_32_bit_array[index_32_bit_floats] < min_float_value_seen) {

      min_float_value_seen = new_32_bit_array[index_32_bit_floats];

    } else if (new_32_bit_array[index_32_bit_floats] > max_float_value_seen) {

      max_float_value_seen = new_32_bit_array[index_32_bit_floats];
    }
  };

  // console.log("max_int_value_seen ", max_int_value_seen, " min_int_value_seen ", min_int_value_seen);
  // console.log("max_float_value_seen ", max_float_value_seen, " min_float_value_seen ", min_float_value_seen);

  return new_32_bit_array;
};

export default convert_16_bit_signed_int_to_32_bit_float;