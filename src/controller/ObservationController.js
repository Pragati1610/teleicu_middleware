import { filterClients } from "../utils/wsUtils.js";

var staticObservations = [];
var activeDevices = [];
var lastRequestData = {};
var logData = [];

const DEFAULT_LISTING_LIMIT = 10;

const addObservation = (observation) => {
  if (activeDevices.includes(observation.device_id)) {
    staticObservations = staticObservations.map((item) => {
      if (item.device_id === observation.device_id) {
        // Slice the observations to the last DEFAULT_LISTING_LIMIT entries
        const slicedObservations =
          item.observations[observation.observation_id]?.slice(
            -DEFAULT_LISTING_LIMIT
          ) || [];
        return {
          ...item,
          observations: {
            ...item.observations,
            [observation.observation_id]: [...slicedObservations, observation],
          },
          last_updated: new Date(),
        };
      }
      return item;
    });
  } else {
    activeDevices.push(observation.device_id);
    staticObservations = [
      ...staticObservations,
      {
        device_id: observation.device_id,
        observations: {
          [observation.observation_id]: [observation],
        },
        last_updated: new Date(),
      },
    ];
  }
};

const addLogData = (newData) => {
  // Slice the log data to the last DEFAULT_LISTING_LIMIT entries
  logData = logData.slice(logData.length - DEFAULT_LISTING_LIMIT);
  logData = [
    ...logData,
    {
      dateTime: new Date(),
      data: newData,
    },
  ];
};

export class ObservationController {
  // static variable to hold the latest observations

  static getObservations(req, res) {
    const limit = req.query?.limit || DEFAULT_LISTING_LIMIT;
    const ip = req.query?.ip;

    if (!ip) {
      return res.json(staticObservations);
    }
    console.log("Filtering");
    const filtered = Object.values(staticObservations).reduce((acc, curr) => {
      console.log("curr", curr);
      const latestValue = curr[ip];
      return latestValue;
    }, []);
    // Sort the observation by last updated time.
    // .sort(
    //   (a, b) => new Date(a.lastObservationAt) - new Date(b.lastObservationAt)
    // )
    // // Limit the results
    // .slice(0, limit);

    return res.json(filtered ?? []);
  }

  static getLogData(req, res) {
    return res.json(logData);
  }

  static getLastRequestData(req, res) {
    return res.json(lastRequestData);
  }

  static updateObservations(req, res) {
    // database logic
    lastRequestData = req.body;
    console.log("updateObservations", req.body);
    addLogData(req.body);
    const observations = req.body;
    // If req.body.observations is an array, then we need to loop through it and create a new observation for each one
    // If req.body.observations is a single object, then we need to create a new observation for it
    // If req.body.observations is undefined, then we need to return an error
    // If req.body.observations is not an array or object, then we need to return an error
    if (!observations) throw new BadRequestException("No observations provided")

    if (typeof observations !== "object") throw new BadRequestException("Invalid observations provided")

    filterClients(req.wsInstance.getWss(), "/observations")
      .forEach(client => {
        const filteredObservations = observations?.filter(observation => observation?.device_id === client?.params?.ip);
        if (filteredObservations.length) {
          client.send(JSON.stringify(filteredObservations))
        }
      });

    if (Array.isArray(observations)) {
      observations.forEach((observation) => {
        console.log("observation", observation.observation_id);
        addObservation(observation);
      });
      return res.send(req.body);
    }

    // console.log("observation", observations.observation_id);
    addObservation(observations);
    // server.clients.forEach((c) => c.send(JSON.stringify(data)));
    res.send(req.body);

  }

  static getTime = async (req, res) => {
    res.send({
      time: new Date().toISOString(),
    });
  };

}
